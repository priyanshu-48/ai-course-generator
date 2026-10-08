import pytest
import requests
import responses

from utils.youtube_service import youtube_service

URL = youtube_service.base_url


def yt_ok(video_id='abc123'):
    return {'items': [{'id': {'videoId': video_id}}]}


@responses.activate
def test_miss_then_hit(redis_fake):
    responses.add(responses.GET, URL, json=yt_ok(), status=200)
    first = youtube_service.search_video('Python Basics')
    second = youtube_service.search_video('  python basics ')  # same normalised key
    assert first == second == 'https://www.youtube.com/watch?v=abc123'
    assert len(responses.calls) == 1
    assert redis_fake.ttl('youtube:python basics') > 0


@responses.activate
def test_no_results_falls_back_to_search_marker(redis_fake):
    responses.add(responses.GET, URL, json={'items': []}, status=200)
    assert youtube_service.search_video('zzz') == 'search:zzz'
    assert redis_fake.keys() == []  # failures are not cached


@responses.activate
def test_http_error_falls_back(redis_fake):
    responses.add(responses.GET, URL, status=403)
    assert youtube_service.search_video('zzz') == 'search:zzz'


@responses.activate
def test_redis_down_still_works(monkeypatch):
    class Dead:
        def get(self, *a):
            raise ConnectionError()

        def setex(self, *a):
            raise ConnectionError()

    monkeypatch.setattr('utils.youtube_service.redis_client', Dead())
    responses.add(responses.GET, URL, json=yt_ok('x1'), status=200)
    assert youtube_service.search_video('anything') == 'https://www.youtube.com/watch?v=x1'


@responses.activate
def test_no_redis_client_at_all(monkeypatch):
    monkeypatch.setattr('utils.youtube_service.redis_client', None)
    responses.add(responses.GET, URL, json=yt_ok('x2'), status=200)
    assert youtube_service.search_video('q').endswith('x2')


@responses.activate
def test_timeout_falls_back(redis_fake):
    responses.add(responses.GET, URL, body=requests.exceptions.Timeout())
    assert youtube_service.search_video('slow') == 'search:slow'


@pytest.fixture(autouse=True)
def no_backoff_sleep(monkeypatch):
    monkeypatch.setattr('utils.youtube_service.time.sleep', lambda s: None)


@responses.activate
def test_retries_transient_5xx_then_succeeds(redis_fake):
    responses.add(responses.GET, URL, status=503)
    responses.add(responses.GET, URL, status=503)
    responses.add(responses.GET, URL, json=yt_ok('ok3'), status=200)
    assert youtube_service.search_video('flaky').endswith('ok3')
    assert len(responses.calls) == 3


@responses.activate
def test_retries_timeout_then_succeeds(redis_fake):
    responses.add(responses.GET, URL, body=requests.exceptions.Timeout())
    responses.add(responses.GET, URL, json=yt_ok('ok2'), status=200)
    assert youtube_service.search_video('slowish').endswith('ok2')
    assert len(responses.calls) == 2


@responses.activate
def test_gives_up_after_max_attempts(redis_fake):
    responses.add(responses.GET, URL, status=503)
    assert youtube_service.search_video('down') == 'search:down'
    assert len(responses.calls) == youtube_service.max_attempts


@responses.activate
def test_quota_error_403_is_not_retried(redis_fake):
    responses.add(responses.GET, URL, status=403)
    assert youtube_service.search_video('quota') == 'search:quota'
    assert len(responses.calls) == 1


@responses.activate
def test_request_has_timeout(redis_fake):
    responses.add(responses.GET, URL, json=yt_ok(), status=200)
    youtube_service.search_video('t')
    assert responses.calls[0].request.req_kwargs['timeout'] == youtube_service.timeout
