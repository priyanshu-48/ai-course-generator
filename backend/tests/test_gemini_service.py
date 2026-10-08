import json
from unittest.mock import MagicMock

import pytest
from django.core.cache import cache

from utils.gemini_service import gemini_service

VALID = {'modules': [{'title': 'M', 'subtopics': [{'title': 's', 'video_url': 'search:q', 'content': 'c'}]}]}


def fake_model(text):
    m = MagicMock()
    m.generate_content.return_value = MagicMock(text=text)
    return m


def test_parse_plain_and_fenced_json():
    assert gemini_service._parse_response(json.dumps(VALID)) == VALID
    assert gemini_service._parse_response('```json\n' + json.dumps(VALID) + '\n```') == VALID


@pytest.mark.parametrize('bad', [
    'not json at all',
    '{"modules": [{"title": "no subtopics"}]}',
    '{"nope": 1}',
    '{"modules": [{"title": "M", "subtopics": [{"title": "missing fields"}]}]}',
])
def test_parse_rejects_malformed(bad):
    with pytest.raises(ValueError):
        gemini_service._parse_response(bad)


def test_generate_calls_model_once_then_hits_cache(monkeypatch):
    model = fake_model(json.dumps(VALID))
    monkeypatch.setattr(gemini_service, 'model', model)
    a = gemini_service.generate_course('Python', 'Learn it', 'AI')
    b = gemini_service.generate_course('  python ', 'LEARN   it!', 'ai')  # normalises to same key
    assert a == b == VALID
    assert model.generate_content.call_count == 1


def test_model_error_is_wrapped_and_not_cached(monkeypatch):
    model = MagicMock()
    model.generate_content.side_effect = RuntimeError('quota')
    monkeypatch.setattr(gemini_service, 'model', model)
    with pytest.raises(Exception, match='Failed to generate course'):
        gemini_service.generate_course('t', 'd', 'AI')
    assert model.generate_content.call_count == 1
    monkeypatch.setattr(gemini_service, 'model', fake_model(json.dumps(VALID)))
    assert gemini_service.generate_course('t', 'd', 'AI') == VALID


def test_cache_failure_does_not_break_generation(monkeypatch):
    def boom(*a, **k):
        raise ConnectionError('redis down')
    monkeypatch.setattr(cache, 'get', boom)
    monkeypatch.setattr(cache, 'set', boom)
    monkeypatch.setattr(gemini_service, 'model', fake_model(json.dumps(VALID)))
    assert gemini_service.generate_course('t', 'd', 'AI') == VALID


@pytest.fixture
def no_backoff(monkeypatch):
    monkeypatch.setattr('utils.gemini_service.time.sleep', lambda s: None)


def test_retries_malformed_json_then_succeeds(monkeypatch, no_backoff):
    model = MagicMock()
    model.generate_content.side_effect = [MagicMock(text='{"modules": [ broken'), MagicMock(text=json.dumps(VALID))]
    monkeypatch.setattr(gemini_service, 'model', model)
    assert gemini_service.generate_course('t', 'd', 'AI') == VALID
    assert model.generate_content.call_count == 2


def test_retries_transient_api_error(monkeypatch, no_backoff):
    from google.api_core import exceptions as gexc
    model = MagicMock()
    model.generate_content.side_effect = [gexc.ServiceUnavailable('503'), MagicMock(text=json.dumps(VALID))]
    monkeypatch.setattr(gemini_service, 'model', model)
    assert gemini_service.generate_course('t', 'd', 'AI') == VALID
    assert model.generate_content.call_count == 2


def test_non_transient_error_not_retried(monkeypatch, no_backoff):
    from google.api_core import exceptions as gexc
    model = MagicMock()
    model.generate_content.side_effect = gexc.InvalidArgument('API key not valid')
    monkeypatch.setattr(gemini_service, 'model', model)
    with pytest.raises(Exception, match='API key not valid'):
        gemini_service.generate_course('t', 'd', 'AI')
    assert model.generate_content.call_count == 1


def test_gives_up_after_max_attempts(monkeypatch, no_backoff):
    model = MagicMock()
    model.generate_content.return_value = MagicMock(text='not json')
    monkeypatch.setattr(gemini_service, 'model', model)
    with pytest.raises(Exception, match='Failed to generate course'):
        gemini_service.generate_course('t', 'd', 'AI')
    assert model.generate_content.call_count == gemini_service.max_attempts
