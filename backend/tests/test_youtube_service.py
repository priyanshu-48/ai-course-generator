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
