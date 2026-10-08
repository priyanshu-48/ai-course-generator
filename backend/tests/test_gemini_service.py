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


def test_model_name_comes_from_settings(settings):
    from unittest import mock
    from utils.gemini_service import GeminiService
    settings.GEMINI_MODEL = 'some-model-name'
    with mock.patch('utils.gemini_service.genai') as genai:
        GeminiService()
    genai.GenerativeModel.assert_called_once_with('some-model-name')


def test_hung_call_times_out_and_respects_budget(monkeypatch, no_backoff):
    import time as _t
    model = MagicMock()
    import threading
    model.generate_content.side_effect = lambda p: threading.Event().wait(0.5)  # real wait (time.sleep is patched)
    monkeypatch.setattr(gemini_service, 'model', model)
    monkeypatch.setattr(gemini_service, 'attempt_timeout', 0.05)
    monkeypatch.setattr(gemini_service, 'total_budget', 0.1)
    monkeypatch.setattr(gemini_service, 'min_retry_window', 0.2)  # budget already below this -> no retry
    t0 = _t.monotonic()
    with pytest.raises(Exception, match='exceeded'):
        gemini_service.generate_course('t', 'd', 'AI')
    assert _t.monotonic() - t0 < 0.4
    assert model.generate_content.call_count == 1
