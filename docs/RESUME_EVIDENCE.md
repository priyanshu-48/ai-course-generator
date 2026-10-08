# Resume evidence

Only the "Verified" rows may be quoted. Method, environment and limitations: [BENCHMARKS.md](BENCHMARKS.md). Raw outputs live in `docs/evidence/`.
Branch `evidence/resume-metrics`; baseline tag `baseline-benchmark`. Dates are 2026-10-08/09.

## Claims table

| Claim | Verified value | Command | Commit | Raw output | Caveats |
|---|---|---|---|---|---|
| Backend test suite | **53 tests, 93 % line coverage** (`courses`, `users`, `utils`) | `cd backend && pytest` | `a19371b` | `evidence/final/backend_coverage.txt` | Gemini/YouTube mocked; `mongomock`/`fakeredis`, not real Mongo/Redis |
| Frontend test suite | **19 tests; 37.6 % overall** (key flows 89–100 %) | `cd frontend && npm run test:coverage` | `a19371b` | `evidence/final/frontend_coverage.txt` | Most pages (Dashboard, Login, Register…) untested; do not quote 37.6 % as "high coverage" |
| CI | Backend tests + frontend lint/test/build + Docker build pass on GitHub Actions | `.github/workflows/ci.yml` | run [37827341004](https://github.com/priyanshu-48/ai-course-generator/actions/runs/37827341004) | GitHub run page | Re-check the latest run before quoting |
| Concurrent YouTube lookups, generation latency | p50 **7.23 s → 3.62 s (−50 %)**, p95 7.25 → 3.63 s | `python -m bench.bench_generation` | `5afb01b` → `2fb164a`; re-run at `f0254df` = 3.61 s | `evidence/baseline/`, `evidence/after_concurrent_youtube/`, `evidence/final/` | **SIM**: Gemini mocked 3.0 s, YouTube 0.15 s/call, 28 lookups. Not real latency |
| Same change, real YouTube | 20 lookups **16.5 s → 3.1 s (5.3×)**; real per-call latency mean 0.83 s | `python -m bench.bench_real --synthetic-terms --yt-cap 40` | `a19371b` | `evidence/real/youtube_real.json` | REAL, one run per group, different query strings, one machine |
| Redis cache effect on generation | warm vs cold YouTube cache p50 **7.28 s → 3.01 s (−58.6 %)**; 28 → 0 YouTube calls per repeated course | same bench, scenarios `youtube_cache_cold/warm` | `5afb01b` | `evidence/baseline/generation_bench.txt` | **SIM**, repeat-course case only. **The "26 %" figure is NOT reproduced by any saved measurement** |
| Retry/backoff reliability | Success under 20 % injected failures **81.0 % → 99.5 %** (YouTube and Gemini) | `python -m bench.bench_resilience` | `04e07d6` → `7d36d4e` | `evidence/baseline/resilience.json`, `evidence/after_retries/resilience.json` | **SIM** seeded faults; 1.00 → 1.22 attempts per call |
| Docker image size | **198.5 MB → 80.8 MB (−59 %)** (`docker image inspect`); 854 → 375 MB by `docker images` | `bash backend/bench/docker_measure.sh <ref> <out>` | `f68b9c6` → `27589da` | `evidence/baseline/docker_build.txt`, `evidence/after_docker/docker_build.txt` | Two ways of reporting size; quote the one named. First baseline was contaminated and is discarded |
| Docker build time | median **91 s → 46 s** (3 runs each, `--no-cache`) | same | same | same | Network-dependent; baseline range 88–99 s, after 43–52 s |
| Gunicorn throughput | at 50 virtual users **573 → 3382 req/s**, p95 116 → 21.5 ms | k6 `backend/bench/k6_read.js` | `675d8b2` | `evidence/after_docker/k6_*.json`, `load_summary.txt` | Trivial endpoints, empty DB; measures server overhead only |
| Generation throttling | 12 rapid requests: 10 allowed then 429; per-IP 10/h + global 20/day (Gemini free tier = 20 req/day) | `pytest tests/test_throttling.py`; Docker smoke test | `f0254df` | `evidence/final/smoke_test_final.txt` | No load test; set `NUM_PROXIES=1` behind a proxy |
| "Redis caching improved performance by 26 %" | **Not verified. Do not use.** | none | none | none | See replacement wording below |
| "Secured with JWT authentication" | Register/login/refresh/rotation/logout work and are tested | `pytest tests/test_users.py` | `d2f18ab` | `evidence/final/backend_coverage.txt` | **Course endpoints are scoped by a client-supplied `X-Demo-User` header, not the JWT**; say "JWT auth" not "secured API" |
| Real end-to-end generation time | **Not measured** (Gemini free-tier quota of 20/day exhausted; 0/10 runs succeeded) | `python -m bench.bench_real --gemini-runs N` | `abaa134` | `evidence/real/real_api_bench.log` | One anecdotal 50.8 s run (n = 1, transcript). Repeat after quota reset |
| Live demo works end to end | **Not verified** | none | none | none | The retired Gemini model (`gemini-2.0-flash-exp`) breaks generation for any build of the old code; needs redeploy with `GEMINI_MODEL`/keys |

## Replacement wording for the weak claims

- Instead of *"Improved performance by 26 % with Redis caching"* →
  *"Added Redis caching for YouTube lookups and Gemini outlines; in a simulated-API benchmark a warm cache removed all 28 YouTube calls per course (p50 7.3 s → 3.0 s)."* (accurate and labelled as simulated).
- Instead of *"secured with JWT authentication"* → *"JWT (SimpleJWT) authentication with refresh-token rotation and blacklist-on-logout"*.
- Instead of *"auto-generate courses"* implying proven uptime → state what is tested: *"tested end to end with mocked Gemini/YouTube (53 backend tests)"*.

## Candidate resume bullets (verified numbers only)

1. **Quality:** *Built a pytest + Vitest test suite (53 backend tests at 93 % coverage, 19 frontend tests) and a GitHub Actions pipeline running tests, lint, build and Docker build; used it to find and fix a broken generation path, a retired Gemini model, and a logout/token-rotation bug.*
2. **Performance:** *Cut simulated course-generation latency 50 % (p50 7.2 s → 3.6 s) by resolving 28 YouTube lookups concurrently with a bounded thread pool; measured 5.3× on real YouTube calls (16.5 s → 3.1 s for 20 lookups).*
3. **Reliability and delivery:** *Added retries with backoff, hard time budgets and quota-aware throttling for Gemini/YouTube calls (success under 20 % injected failures 81 % → 99.5 %); shrank the Docker image 59 % (199 → 81 MB), halved build time, and moved to Gunicorn (≈6× throughput at 50 concurrent users).*

Optional blanks to fill once measured (leave out until then):
- Real end-to-end generation time, before → after: **[ ___ s → ___ s, n = ___ ]** (needs a Gemini quota reset and `bench_real`).
- Read-endpoint p50/p95 on a seeded dataset: **[ ___ ]** (not done).
- Users / demo sessions: **[ ___ ]** (unknown).

## Things to be ready to explain in an interview

- Why SIM numbers are relative, and what the real latencies were (YouTube 0.83 s/call; Gemini ≈ 50 s is the real bottleneck).
- The 26 % claim could not be reproduced; the corrected statement is above.
- Demo-grade identity (header-based scoping) is a known gap, listed in the README roadmap.
