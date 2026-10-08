import pytest
import responses

from courses.models import Course, Module, Subtopic
from utils.youtube_service import youtube_service

pytestmark = pytest.mark.django_db
H = {'HTTP_X_DEMO_USER': 'demo-1'}
PAYLOAD = {'title': 'X', 'description': 'learn x', 'category': 'AI'}


@pytest.fixture
def gen(monkeypatch, sample_course):
    monkeypatch.setattr('courses.views.gemini_service.generate_course', lambda *a: sample_course)


def make_course(user='demo-1'):
    subs = [Subtopic(title=f's{i}', video_url='https://youtu.be/x', content='c', order=i) for i in range(4)]
    return Course(user_id=user, title='T', description='d', category='AI',
                  modules=[Module(title='m', subtopics=subs)]).save()


@responses.activate
def test_create_resolves_videos_and_saves(client, gen, redis_fake):
    responses.add(responses.GET, youtube_service.base_url, json={'items': [{'id': {'videoId': 'v1'}}]})
    r = client.post('/api/courses/create/', PAYLOAD, format='json', **H)
    assert r.status_code == 201, r.data
    subs = [s for m in r.data['modules'] for s in m['subtopics']]
    assert len(subs) == 4
    assert all(s['video_url'] == 'https://www.youtube.com/watch?v=v1' for s in subs)
    assert Course.objects(user_id='demo-1').count() == 1
    # 3 distinct search terms among 4 subtopics; the repeated one is served from cache
    assert len(responses.calls) == 3


@responses.activate
def test_create_with_youtube_failure(client, gen, redis_fake):
    """YouTube down: view must not crash. Records current behaviour for the 'search:' fallback."""
    responses.add(responses.GET, youtube_service.base_url, status=500)
    r = client.post('/api/courses/create/', PAYLOAD, format='json', **H)
    assert r.status_code == 201
    assert r.data['modules'][0]['subtopics'][0]['video_url'].startswith('search:')


def test_create_gemini_failure_returns_500(client, monkeypatch):
    def boom(*a):
        raise Exception('Failed to generate course: bad json')
    monkeypatch.setattr('courses.views.gemini_service.generate_course', boom)
    r = client.post('/api/courses/create/', PAYLOAD, format='json', **H)
    assert r.status_code == 500 and 'Failed to generate' in r.data['error']
    assert 'bad json' not in r.data['error']  # internal detail is logged, not returned
    assert Course.objects.count() == 0


def test_create_validation(client):
    r = client.post('/api/courses/create/', {'title': 'x', 'description': 'd', 'category': 'Nope'}, format='json', **H)
    assert r.status_code == 400


def test_list_and_detail_scoped_to_demo_user(client):
    mine, other = make_course('demo-1'), make_course('demo-2')
    r = client.get('/api/courses/', **H)
    assert [c['id'] for c in r.data] == [str(mine.pk)]
    assert client.get(f'/api/courses/{mine.pk}/', **H).status_code == 200
    assert client.get(f'/api/courses/{other.pk}/', **H).status_code == 404


def test_cannot_modify_or_delete_other_users_course(client):
    other = make_course('demo-2')
    assert client.post(f'/api/courses/{other.pk}/module/0/subtopic/0/toggle/', **H).status_code == 404
    assert client.post(f'/api/courses/{other.pk}/progress/', {'module_index': 1}, format='json', **H).status_code == 404
    assert client.delete(f'/api/courses/{other.pk}/', **H).status_code == 404
    other.reload()
    assert other.modules[0].subtopics[0].completed is False


def test_toggle_and_progress_percentage(client):
    c = make_course()
    for i in (0, 1):
        r = client.post(f'/api/courses/{c.pk}/module/0/subtopic/{i}/toggle/', **H)
        assert r.status_code == 200 and r.data['completed'] is True
    assert client.get(f'/api/courses/{c.pk}/', **H).data['progress_percentage'] == 50
    client.post(f'/api/courses/{c.pk}/module/0/subtopic/0/toggle/', **H)  # untoggle
    assert client.get(f'/api/courses/{c.pk}/', **H).data['progress_percentage'] == 25


def test_toggle_invalid_indices(client):
    c = make_course()
    assert client.post(f'/api/courses/{c.pk}/module/5/subtopic/0/toggle/', **H).status_code == 400
    assert client.post(f'/api/courses/{c.pk}/module/0/subtopic/9/toggle/', **H).status_code == 400


def test_progress_position_saved(client):
    c = make_course()
    r = client.post(f'/api/courses/{c.pk}/progress/', {'module_index': 0, 'subtopic_index': 2}, format='json', **H)
    assert r.status_code == 200 and r.data['current_subtopic_index'] == 2


def test_delete(client):
    c = make_course()
    assert client.delete(f'/api/courses/{c.pk}/', **H).status_code == 204
    assert Course.objects.count() == 0


def test_missing_demo_header_shares_anonymous_bucket(client):
    """Documents a known gap: no X-Demo-User header means the shared 'anonymous' scope."""
    c = make_course('anonymous')
    assert client.get(f'/api/courses/{c.pk}/').status_code == 200


@responses.activate
def test_video_resolution_preserves_order_and_dedupes(client, gen, redis_fake):
    """Each subtopic keeps its own video, and a repeated search term costs one YouTube call."""
    def cb(request):
        import json
        q = request.params['q']
        return (200, {}, json.dumps({'items': [{'id': {'videoId': 'id-' + q.replace(' ', '-')}}]}))
    responses.add_callback(responses.GET, youtube_service.base_url, callback=cb)
    r = client.post('/api/courses/create/', PAYLOAD, format='json', **H)
    urls = [s['video_url'] for m in r.data['modules'] for s in m['subtopics']]
    assert urls == [
        'https://www.youtube.com/watch?v=id-x-basics',
        'https://www.youtube.com/watch?v=id-why-x',
        'https://www.youtube.com/watch?v=id-x-deep-dive',
        'https://www.youtube.com/watch?v=id-x-basics',
    ]
    assert len(responses.calls) == 3


def test_video_lookups_run_concurrently_but_bounded(client, monkeypatch, redis_fake):
    import threading
    import time
    from courses import views
    big = {'modules': [{'title': 'M', 'subtopics': [
        {'title': f't{i}', 'video_url': f'search:term {i}', 'content': 'c'} for i in range(20)]}]}
    monkeypatch.setattr('courses.views.gemini_service.generate_course', lambda *a: big)
    lock, state = threading.Lock(), {'now': 0, 'peak': 0}

    def slow(term):
        with lock:
            state['now'] += 1
            state['peak'] = max(state['peak'], state['now'])
        time.sleep(0.05)
        with lock:
            state['now'] -= 1
        return f'https://www.youtube.com/watch?v={term.replace(" ", "")}'
    monkeypatch.setattr('courses.views.youtube_service.search_video', slow)
    r = client.post('/api/courses/create/', PAYLOAD, format='json', **H)
    assert r.status_code == 201
    assert 1 < state['peak'] <= views.VIDEO_LOOKUP_WORKERS
