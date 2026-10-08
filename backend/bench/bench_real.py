"""REAL Gemini + YouTube latency (uses your keys and free-tier quota). Never touches MongoDB or Redis.

Phase 1: N Gemini course generations (unique topics, cache bypassed): latency, parse success, size.
Phase 2: YouTube search latency, resolving terms taken from the generated courses:
   - sequential: first course's terms, one at a time (per-call latency distribution)
   - concurrent: second course's terms via courses.views.resolve_videos (wall time)
   Total YouTube calls are capped (each search.list costs 100 quota units; default daily quota 10,000).

Run (from backend/): python -m bench.bench_real --gemini-runs 1 --yt-cap 0 --out ../docs/evidence/real/real_probe.json
"""
import argparse
import json
import logging
import os
import statistics
import subprocess
import time

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django  # noqa: E402

django.setup()
logging.disable(logging.CRITICAL)

from courses.views import resolve_videos  # noqa: E402
from utils import youtube_service as yt_mod  # noqa: E402
from utils.gemini_service import gemini_service  # noqa: E402

TOPICS = [
    ('Introduction to Docker', 'Containers for beginners', 'DevOps'),
    ('Python Data Analysis with Pandas', 'Clean and analyse tabular data', 'Data Science'),
    ('React Fundamentals', 'Build interactive UIs with React', 'Web Development'),
    ('Machine Learning Basics', 'Core ideas of supervised learning', 'AI'),
    ('Git and GitHub Essentials', 'Version control for teams', 'Other'),
    ('Intro to Cybersecurity', 'Threats, defences and good habits', 'Cybersecurity'),
    ('SQL for Beginners', 'Query relational databases', 'Data Science'),
    ('Kubernetes Basics', 'Orchestrate containers', 'Cloud Computing'),
    ('Android App Development', 'Build a first Android app', 'Mobile Development'),
    ('Unity Game Development', 'Make a simple 2D game', 'Game Development'),
]


def stats(vals):
    s = sorted(vals)
    pick = lambda p: s[min(len(s) - 1, int(round((len(s) - 1) * p)))]  # noqa: E731
    return {'n': len(s), 'mean': round(statistics.mean(s), 3), 'p50': round(pick(.5), 3), 'p95': round(pick(.95), 3),
            'min': round(s[0], 3), 'max': round(s[-1], 3), 'stdev': round(statistics.pstdev(s), 3)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--gemini-runs', type=int, default=10)
    ap.add_argument('--yt-cap', type=int, default=60, help='max total YouTube search calls')
    ap.add_argument('--pause', type=float, default=6.0, help='seconds between Gemini calls (rate limits)')
    ap.add_argument('--synthetic-terms', action='store_true',
                    help='skip Gemini; time YouTube on realistic made-up lesson search terms')
    ap.add_argument('--out', required=True)
    a = ap.parse_args()

    gem = []
    courses = []
    if a.synthetic_terms:
        a.gemini_runs = 0
        lessons = ['introduction', 'core concepts', 'setup', 'hands on example', 'best practices', 'common mistakes',
                   'advanced techniques', 'project walkthrough', 'debugging', 'testing']
        for t in TOPICS[:2]:  # 2 courses x 20 distinct terms
            subs = [{'video_url': f'search:{t[0].lower()} {l} tutorial {k}'} for k in range(2) for l in lessons]
            courses.append({'modules': [{'subtopics': subs}]})
    for i in range(a.gemini_runs):
        title, desc, cat = TOPICS[i % len(TOPICS)]
        t0 = time.perf_counter()
        try:
            data = gemini_service._generate_gemini_course(title, desc, cat)
            dt = time.perf_counter() - t0
            n_sub = sum(len(m['subtopics']) for m in data['modules'])
            gem.append({'topic': title, 'ok': True, 'seconds': round(dt, 3), 'modules': len(data['modules']), 'subtopics': n_sub})
            courses.append(data)
        except Exception as e:
            gem.append({'topic': title, 'ok': False, 'seconds': round(time.perf_counter() - t0, 3), 'error': str(e)[:200]})
        print(f"gemini {i + 1}/{a.gemini_runs}: {gem[-1]}", flush=True)
        time.sleep(a.pause)

    yt = {'cap': a.yt_cap}
    budget = a.yt_cap
    if budget and len(courses) >= 2:
        yt_mod.redis_client = None  # real network, no cache
        terms = lambda c: [s['video_url'][7:].strip() for m in c['modules'] for s in m['subtopics']]  # noqa: E731
        seq_terms = terms(courses[0])[:budget // 2]
        per_call, fails = [], 0
        t0 = time.perf_counter()
        for t in seq_terms:
            c0 = time.perf_counter()
            r = yt_mod.youtube_service.search_video(t)
            per_call.append(time.perf_counter() - c0)
            fails += not r.startswith('https://')
        seq_wall = time.perf_counter() - t0
        conc = {'subtopics': [{'title': 'x', 'video_url': 'search:' + t, 'content': 'c'} for t in terms(courses[1])[:budget - len(seq_terms)]]}
        t0 = time.perf_counter()
        resolve_videos({'modules': [conc]})
        conc_wall = time.perf_counter() - t0
        conc_fail = sum(not s['video_url'].startswith('https://') for s in conc['subtopics'])
        yt.update({
            'sequential': {'calls': len(seq_terms), 'wall_seconds': round(seq_wall, 3), 'unresolved': fails, 'per_call_seconds': stats(per_call)},
            'concurrent': {'calls': len(conc['subtopics']), 'workers': 8, 'wall_seconds': round(conc_wall, 3), 'unresolved': conc_fail},
        })
        print('youtube', json.dumps(yt), flush=True)

    ok = [g['seconds'] for g in gem if g['ok']]
    res = {
        'meta': {
            'label': 'REAL Gemini + YouTube APIs; no MongoDB/Redis; unique topics, caches bypassed',
            'commit': subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip(),
            'date': time.strftime('%Y-%m-%dT%H:%M:%S%z'), 'model': django.conf.settings.GEMINI_MODEL, 'params': vars(a),
        },
        'gemini': {'runs': gem, 'success': len(ok), 'attempted': len(gem), 'seconds': stats(ok) if ok else None},
        'youtube': yt,
    }
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    json.dump(res, open(a.out, 'w'), indent=2)


if __name__ == '__main__':
    main()
