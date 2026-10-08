"""Reliability under SIMULATED transient failures (seeded, deterministic). Backoff sleeps are skipped.

YouTube: each HTTP attempt fails with 503 w.p. P. Metric = % of lookups that return a real video URL.
Gemini : each model attempt returns malformed JSON w.p. P (or raises ServiceUnavailable w.p. P).
         Metric = % of generations that succeed.

Run (from backend/): python -m bench.bench_resilience --out ../docs/evidence/<dir>/resilience.json
"""
import argparse
import json
import os
import random
import subprocess
import time
from unittest import mock

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.test_settings')
import django  # noqa: E402

django.setup()

import requests  # noqa: E402
from django.core.cache import cache  # noqa: E402
from google.api_core import exceptions as gexc  # noqa: E402

from utils import youtube_service as yt_mod  # noqa: E402
from utils.gemini_service import gemini_service  # noqa: E402

GOOD = json.dumps({'modules': [{'title': 'M', 'subtopics': [{'title': 's', 'video_url': 'search:q', 'content': 'c'}]}]})


def youtube_trial(n, p, rng):
    attempts = {'n': 0}

    def fake_get(url, params=None, timeout=None):
        attempts['n'] += 1
        resp = mock.Mock()
        if rng.random() < p:
            resp.raise_for_status.side_effect = requests.exceptions.HTTPError('503')
            return resp
        resp.raise_for_status.return_value = None
        resp.json.return_value = {'items': [{'id': {'videoId': 'abc'}}]}
        return resp

    ok = 0
    with mock.patch.object(yt_mod.requests, 'get', fake_get), mock.patch.object(yt_mod, 'redis_client', None), \
            mock.patch.object(time, 'sleep', lambda s: None):
        for i in range(n):
            if yt_mod.youtube_service.search_video(f'term {i}').startswith('https://'):
                ok += 1
    return {'lookups': n, 'success_pct': round(100 * ok / n, 1), 'http_attempts_per_lookup': round(attempts['n'] / n, 2)}


def gemini_trial(n, p, rng):
    calls = {'n': 0}

    def fake_generate(prompt):
        calls['n'] += 1
        r = rng.random()
        if r < p / 2:
            raise gexc.ServiceUnavailable('503')
        if r < p:
            return mock.Mock(text='{"modules": [ broken')
        return mock.Mock(text=GOOD)

    ok = 0
    with mock.patch.object(gemini_service.model, 'generate_content', side_effect=fake_generate), \
            mock.patch.object(time, 'sleep', lambda s: None):
        for i in range(n):
            cache.clear()
            try:
                gemini_service.generate_course(f'topic {i}', 'd', 'AI')
                ok += 1
            except Exception:
                pass
    return {'generations': n, 'success_pct': round(100 * ok / n, 1), 'model_calls_per_generation': round(calls['n'] / n, 2)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--trials', type=int, default=2000)
    ap.add_argument('--fail-rate', type=float, default=0.2)
    ap.add_argument('--seed', type=int, default=1234)
    ap.add_argument('--out', required=True)
    a = ap.parse_args()
    res = {
        'meta': {
            'label': 'SIMULATED transient failures (seeded RNG); not real API failure rates',
            'commit': subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip(),
            'dirty': bool(subprocess.run(['git', 'status', '--porcelain', '--', '.'], capture_output=True, text=True).stdout.strip()),
            'date': time.strftime('%Y-%m-%dT%H:%M:%S%z'), 'params': vars(a),
        },
        'youtube': youtube_trial(a.trials, a.fail_rate, random.Random(a.seed)),
        'gemini': gemini_trial(a.trials, a.fail_rate, random.Random(a.seed)),
    }
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    json.dump(res, open(a.out, 'w'), indent=2)
    print('youtube', res['youtube'])
    print('gemini ', res['gemini'])


if __name__ == '__main__':
    main()
