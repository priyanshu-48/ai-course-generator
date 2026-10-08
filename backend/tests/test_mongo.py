import pytest

from utils import mongo


@pytest.fixture
def disconnected(monkeypatch, settings):
    """Pretend no default Mongo connection exists yet."""
    settings.MONGODB_URI = 'mongodb://example.invalid/db'
    monkeypatch.setattr(mongo, '_connections', {})
    monkeypatch.setattr(mongo, '_last_attempt', 0.0)


def test_retries_after_failure_but_rate_limited(disconnected, monkeypatch):
    calls = []

    def fake_connect(**kw):
        calls.append(kw)
        if len(calls) == 1:
            raise RuntimeError('DNS query name does not exist')
        mongo._connections['default'] = object()

    monkeypatch.setattr(mongo.mongoengine, 'connect', fake_connect)
    clock = {'t': 100.0}
    monkeypatch.setattr(mongo.time, 'monotonic', lambda: clock['t'])

    assert mongo.ensure_connected() is False           # cluster down
    assert mongo.ensure_connected() is False           # immediately again: rate-limited, no new attempt
    assert len(calls) == 1
    clock['t'] += mongo.RETRY_SECONDS + 1
    assert mongo.ensure_connected() is True            # cluster back: recovers without a restart
    assert mongo.ensure_connected() is True and len(calls) == 2


def test_no_uri_means_no_attempt(disconnected, monkeypatch, settings):
    settings.MONGODB_URI = ''
    monkeypatch.setattr(mongo.mongoengine, 'connect', lambda **kw: pytest.fail('should not connect'))
    assert mongo.ensure_connected() is False


def test_middleware_connects_only_for_api_paths(client, monkeypatch):
    seen = []
    monkeypatch.setattr(mongo, 'ensure_connected', lambda: seen.append(1) or True)
    client.get('/ping/')
    assert seen == []
    client.get('/api/courses/', HTTP_X_DEMO_USER='d')
    assert seen == [1]


def test_health_up_and_down(client, monkeypatch):
    r = client.get('/health/')
    assert r.status_code == 200 and r.json()['mongo'] == 'up'
    monkeypatch.setattr('core.views.ensure_connected', lambda: False)
    r = client.get('/health/')
    assert r.status_code == 503 and r.json()['mongo'] == 'down'
    assert client.get('/ping/').status_code == 200   # wake-up probe never depends on Mongo
