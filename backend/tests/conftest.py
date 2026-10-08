import fakeredis
import mongoengine
import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

SAMPLE_COURSE = {
    'modules': [
        {'title': 'Intro', 'subtopics': [
            {'title': 'What is X', 'video_url': 'search:x basics', 'content': 'c1'},
            {'title': 'Why X', 'video_url': 'search:why x', 'content': 'c2'},
        ]},
        {'title': 'Advanced', 'subtopics': [
            {'title': 'X deep dive', 'video_url': 'search:x deep dive', 'content': 'c3'},
            {'title': 'X tips', 'video_url': 'search:x basics', 'content': 'c4'},
        ]},
    ]
}


@pytest.fixture(scope='session', autouse=True)
def mongo():
    mongoengine.disconnect_all()
    mongoengine.connect('test', host='mongodb://localhost', mongo_client_class=__import__('mongomock').MongoClient)
    yield
    mongoengine.disconnect_all()


@pytest.fixture(autouse=True)
def clean_state():
    from courses.models import Course
    Course.drop_collection()
    cache.clear()
    yield


@pytest.fixture(autouse=True)
def isolated_gemini(monkeypatch):
    """No real fallback models (they are live network clients) and no cross-test quota state."""
    from utils.gemini_service import gemini_service
    monkeypatch.setattr(gemini_service, 'fallbacks', [])
    monkeypatch.setattr(gemini_service, 'exhausted_until', {})


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def redis_fake(monkeypatch):
    r = fakeredis.FakeRedis(decode_responses=True)
    monkeypatch.setattr('utils.youtube_service.redis_client', r)
    return r


@pytest.fixture
def sample_course():
    import copy
    return copy.deepcopy(SAMPLE_COURSE)
