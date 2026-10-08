"""Course-generation benchmark with SIMULATED external APIs.

Measures own-code cost of POST /api/courses/create/ with Gemini and YouTube mocked at fixed
latency. Absolute numbers are NOT real end-to-end latency; compare scenarios/commits only.

Run (from backend/):  python -m bench.bench_generation --out ../docs/evidence/<dir>/gen.json
"""
import argparse
import json
import os
import platform
import subprocess
import threading
import time
from unittest import mock

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.test_settings')

import django  # noqa: E402

django.setup()

import fakeredis  # noqa: E402
import mongoengine  # noqa: E402
import mongomock  # noqa: E402
from django.core.cache import cache  # noqa: E402
from rest_framework.test import APIClient  # noqa: E402

from courses.models import Course  # noqa: E402
from utils import youtube_service as yt_mod  # noqa: E402
from utils.gemini_service import gemini_service  # noqa: E402

PAYLOAD = {'title': 'Benchmark Course', 'description': 'A fixed benchmark topic', 'category': 'AI'}


def build_course(n_modules, n_sub):
    return {'modules': [
        {'title': f'Module {m}', 'subtopics': [
            {'title': f'Lesson {m}.{s}', 'video_url': f'search:topic {m} lesson {s}', 'content': 'x' * 600}
            for s in range(n_sub)]}
        for m in range(n_modules)]}


class FakeYouTube:
    """Replaces requests.get inside youtube_service; counts calls and peak concurrency."""

    def __init__(self, latency):
        self.latency, self.calls, self.inflight, self.max_inflight = latency, 0, 0, 0
        self.lock = threading.Lock()

    def get(self, url, params=None, timeout=None):
        with self.lock:
            self.calls += 1
            self.inflight += 1
            self.max_inflight = max(self.max_inflight, self.inflight)
        time.sleep(self.latency)
        with self.lock:
            self.inflight -= 1
        resp = mock.Mock()
        resp.raise_for_status.return_value = None
        resp.json.return_value = {'items': [{'id': {'videoId': 'v' + str(abs(hash(params['q'])) % 10**8)}}]}
        return resp


def pct(sorted_vals, p):
    k = (len(sorted_vals) - 1) * p
    lo, hi = int(k), min(int(k) + 1, len(sorted_vals) - 1)
    return sorted_vals[lo] + (sorted_vals[hi] - sorted_vals[lo]) * (k - lo)


def run_scenario(name, args, course_json, yt_cache, gemini_cache):
    """yt_cache: 'off' | 'cold' | 'warm'; gemini_cache: 'off' | 'warm'."""
    client = APIClient()
    gemini_calls = {'n': 0}

    def fake_generate(prompt):
        gemini_calls['n'] += 1
        time.sleep(args.gemini_latency)
        return mock.Mock(text=json.dumps(course_json))

    cache.clear()
    shared_redis = fakeredis.FakeRedis(decode_responses=True)
    times, yt_calls, max_inflight = [], [], []
    hits = misses = 0
    total = args.warmup + args.runs
    with mock.patch.object(gemini_service.model, 'generate_content', side_effect=fake_generate):
        for i in range(total):
            fake = FakeYouTube(args.youtube_latency)
            if yt_cache == 'off':
                redis_obj = None
            elif yt_cache == 'cold':
                redis_obj = fakeredis.FakeRedis(decode_responses=True)  # empty each run
            else:
                redis_obj = shared_redis  # warmed by a priming request below
            Course.drop_collection()
            if gemini_cache == 'off':
                cache.clear()
            if i == 0 and yt_cache == 'warm':  # prime YouTube cache (not measured)
                with mock.patch.object(yt_mod.requests, 'get', fake.get), \
                        mock.patch.object(yt_mod, 'redis_client', redis_obj):
                    client.post('/api/courses/create/', PAYLOAD, format='json', HTTP_X_DEMO_USER='bench')
                fake = FakeYouTube(args.youtube_latency)
                Course.drop_collection()
            if gemini_cache == 'warm' and i == 0:
                pass  # first (warm-up) iteration fills the Gemini cache; it is not measured
            with mock.patch.object(yt_mod.requests, 'get', fake.get), \
                    mock.patch.object(yt_mod, 'redis_client', redis_obj):
                t0 = time.perf_counter()
                r = client.post('/api/courses/create/', PAYLOAD, format='json', HTTP_X_DEMO_USER='bench')
                dt = time.perf_counter() - t0
            assert r.status_code == 201, r.content[:300]
            if i >= args.warmup:
                times.append(dt)
                yt_calls.append(fake.calls)
                max_inflight.append(fake.max_inflight)
    s = sorted(times)
    n_sub = args.modules * args.subtopics
    total_lookups = n_sub * args.runs
    return {
        'scenario': name, 'youtube_cache': yt_cache, 'gemini_cache': gemini_cache,
        'runs': len(times),
        'p50_s': round(pct(s, .5), 4), 'p95_s': round(pct(s, .95), 4),
        'mean_s': round(sum(s) / len(s), 4), 'min_s': round(s[0], 4), 'max_s': round(s[-1], 4),
        'youtube_calls_per_course_mean': round(sum(yt_calls) / len(yt_calls), 2),
        'youtube_lookups_avoided_pct': round(100 * (1 - sum(yt_calls) / total_lookups), 1),
        'peak_concurrent_youtube_calls': max(max_inflight),
        'gemini_calls_total': gemini_calls['n'],
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--runs', type=int, default=30)
    ap.add_argument('--warmup', type=int, default=2)
    ap.add_argument('--modules', type=int, default=7)
    ap.add_argument('--subtopics', type=int, default=4)
    ap.add_argument('--gemini-latency', type=float, default=3.0)
    ap.add_argument('--youtube-latency', type=float, default=0.15)
    ap.add_argument('--out', required=True)
    args = ap.parse_args()

    mongoengine.disconnect_all()
    mongoengine.connect('bench', host='mongodb://localhost', mongo_client_class=mongomock.MongoClient)
    course_json = build_course(args.modules, args.subtopics)

    results = [
        run_scenario('no_cache', args, course_json, yt_cache='off', gemini_cache='off'),
        run_scenario('youtube_cache_cold', args, course_json, yt_cache='cold', gemini_cache='off'),
        run_scenario('youtube_cache_warm', args, course_json, yt_cache='warm', gemini_cache='off'),
        run_scenario('all_caches_warm', args, course_json, yt_cache='warm', gemini_cache='warm'),
    ]
    meta = {
        'label': 'SIMULATED external APIs (Gemini/YouTube mocked, mongomock DB); not real end-to-end latency',
        'commit': subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip(),
        'dirty': bool(subprocess.run(['git', 'status', '--porcelain', '--', '.'], capture_output=True, text=True).stdout.strip()),
        'date': time.strftime('%Y-%m-%dT%H:%M:%S%z'),
        'python': platform.python_version(),
        'params': vars(args), 'subtopics_per_course': args.modules * args.subtopics,
        'command': 'python -m bench.bench_generation ' + ' '.join(f'--{k.replace("_", "-")} {v}' for k, v in vars(args).items()),
    }
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(args.out, 'w') as f:
        json.dump({'meta': meta, 'results': results}, f, indent=2)
    for r in results:
        print(f"{r['scenario']:22s} p50={r['p50_s']:.3f}s p95={r['p95_s']:.3f}s "
              f"yt_calls/course={r['youtube_calls_per_course_mean']} avoided={r['youtube_lookups_avoided_pct']}% "
              f"peak_inflight={r['peak_concurrent_youtube_calls']} gemini_calls={r['gemini_calls_total']}")


if __name__ == '__main__':
    main()
