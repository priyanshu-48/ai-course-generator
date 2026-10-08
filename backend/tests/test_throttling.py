import pytest
from django.core.cache import cache
from rest_framework.throttling import SimpleRateThrottle

pytestmark = pytest.mark.django_db
BAD = {}  # invalid body: 400 when the request is allowed, 429 when throttled (throttle runs first)


@pytest.fixture
def rates(monkeypatch):
    def set_rates(ip='2/min', glob='100/day'):
        monkeypatch.setitem(SimpleRateThrottle.THROTTLE_RATES, 'generate_ip', ip)
        monkeypatch.setitem(SimpleRateThrottle.THROTTLE_RATES, 'generate_global', glob)
    return set_rates


def post(client, ip='1.1.1.1', **extra):
    return client.post('/api/courses/create/', BAD, format='json', REMOTE_ADDR=ip, **extra).status_code


def test_per_ip_limit_returns_429_and_other_ips_unaffected(client, rates):
    rates(ip='2/min')
    assert [post(client), post(client), post(client)] == [400, 400, 429]
    assert post(client, ip='2.2.2.2') == 400


def test_global_limit_applies_across_ips(client, rates):
    rates(ip='100/min', glob='3/day')
    assert [post(client, ip=f'9.9.9.{i}') for i in range(4)] == [400, 400, 400, 429]


def test_only_generation_endpoint_is_throttled(client, rates):
    rates(ip='1/min')
    post(client)
    assert client.get('/api/courses/', HTTP_X_DEMO_USER='d', REMOTE_ADDR='1.1.1.1').status_code == 200


def test_spoofed_forwarded_header_cannot_bypass_limit(client, rates):
    rates(ip='1/min')  # NUM_PROXIES defaults to 0 -> X-Forwarded-For is ignored
    assert post(client, HTTP_X_FORWARDED_FOR='5.5.5.1') == 400
    assert post(client, HTTP_X_FORWARDED_FOR='5.5.5.2') == 429


def test_trusted_proxy_uses_forwarded_client_ip(client, rates, settings):
    rates(ip='1/min')
    settings.REST_FRAMEWORK = {**settings.REST_FRAMEWORK, 'NUM_PROXIES': 1}
    assert post(client, ip='10.0.0.1', HTTP_X_FORWARDED_FOR='5.5.5.1') == 400
    assert post(client, ip='10.0.0.1', HTTP_X_FORWARDED_FOR='5.5.5.2') == 400  # different real client
    assert post(client, ip='10.0.0.1', HTTP_X_FORWARDED_FOR='5.5.5.1') == 429


def test_throttle_store_down_fails_open(client, rates, monkeypatch):
    rates(ip='1/min')

    def boom(*a, **k):
        raise ConnectionError('redis down')
    monkeypatch.setattr(cache, 'get', boom)
    monkeypatch.setattr(cache, 'set', boom)
    assert [post(client), post(client), post(client)] == [400, 400, 400]
