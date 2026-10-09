# Resume evidence

Only the "Verified" rows may be quoted on a resume. Method, environment and limitations: [BENCHMARKS.md](BENCHMARKS.md). Raw outputs live in `docs/evidence/`.

**Last verified:** 2026-10-09 at commit `6c691e9` on `main` (frontend row verified at `d0aa509`; live UI confirmed deployed on 2026-10-09). CI for that commit: [passing](https://github.com/priyanshu-48/ai-course-generator/actions/runs/37836654489). Every number below was cross-checked against its raw file on that date.
Baseline for all before/after comparisons: git tag `baseline-benchmark` (`f68b9c6`).

## Claims table

| Claim | Verified value | Command | Commit | Raw output | Caveats |
|---|---|---|---|---|---|
| Backend test suite | **63 tests, 94 % line coverage** (`courses`, `users`, `utils`) | `cd backend && pytest` | `6c691e9` | `evidence/final/backend_coverage.txt` | Gemini/YouTube mocked; `mongomock` / `fakeredis`, not real Mongo/Redis |
| Frontend test suite | **32 tests; 93.6 % line coverage** (all files except the 30-line `App.jsx` router) | `cd frontend && npm run test:coverage` | `d0aa509` | `evidence/final/frontend_coverage.txt` | Coverage jumped from 37.6 % partly because untested placeholder pages were deleted. API layer is mocked; no browser end-to-end tests |
| CI | Backend tests, frontend lint/test/build and Docker build pass on GitHub Actions | `.github/workflows/ci.yml` | run [37836654489](https://github.com/priyanshu-48/ai-course-generator/actions/runs/37836654489) | GitHub run page | Re-check the latest run before applying |
| Concurrent YouTube lookups, generation latency | p50 **7.23 s → 3.62 s (−50 %)**; p95 7.25 s → 3.63 s | `cd backend && python -m bench.bench_generation --out …` | `5afb01b` → `2fb164a`; re-run at `f0254df`: 3.61 s | `evidence/baseline/`, `evidence/after_concurrent_youtube/`, `evidence/final/` | **Simulated APIs**: Gemini mocked 3.0 s, YouTube 0.15 s/call, 28 lookups, 30 runs. Always say "simulated" |
| Same change on real YouTube | 20 lookups **16.5 s → 3.1 s (5.3×)**; real per-call latency mean 0.83 s (p95 0.90 s) | `python -m bench.bench_real --synthetic-terms --yt-cap 40 --out …` | `a19371b` | `evidence/real/youtube_real.json` | Real API, one run per group, different query strings in each group, one machine |
| Redis cache effect | warm vs cold YouTube cache p50 **7.28 s → 3.01 s (−58.6 %)**; 28 → 0 YouTube calls on a repeated course | same bench, scenarios `youtube_cache_cold` / `youtube_cache_warm` | `5afb01b` | `evidence/baseline/generation_bench.txt` | **Simulated**, repeat-course case only. **The old "26 %" figure is not reproduced by any saved measurement** |
| Retry/backoff reliability | Success under 20 % injected failures **81.0 % → 99.5 %** (YouTube lookups and Gemini generations, 2000 trials each); 1.00 → 1.22 attempts per call | `python -m bench.bench_resilience --out …` | `04e07d6` → `7d36d4e` | `evidence/baseline/resilience.json`, `evidence/after_retries/resilience.json` | **Simulated** seeded faults, not real API failure rates |
| Docker image size | **198.5 MB → 80.8 MB (−59 %)** by `docker image inspect` (854 → 375 MB by `docker images`) | `bash backend/bench/docker_measure.sh <ref> <out>` | `f68b9c6` → `27589da` | `evidence/baseline/docker_build.txt`, `evidence/after_docker/docker_build.txt` | Two ways of measuring; name the one you quote. Builds are from clean checkouts (an earlier contaminated baseline is kept as `…INVALID…` and not used) |
| Docker build time | median **91 s → 46 s** (3 `--no-cache` builds each; 88–99 s → 43–52 s) | same | same | same | Network-dependent; say "about halved" |
| Gunicorn throughput | at 50 virtual users **573 → 3382 req/s (≈5.9×)**; p95 115.8 ms → 21.5 ms | k6, `backend/bench/k6_read.js` | `675d8b2` | `evidence/after_docker/k6_*.json`, `load_summary.txt` | Trivial endpoints (`/ping/`, empty course list) so it measures server overhead only; not a seeded-data read benchmark |
| Generation throttling | Per client IP 10/hour + global 60/day; in a Docker smoke test 12 rapid requests gave ten allowed then 429s; fails open if Redis is down | `pytest tests/test_throttling.py` | `f0254df` (limits changed to 60/day in `6c691e9`) | `evidence/final/smoke_test_final.txt` | The smoke test ran with the earlier defaults; not load-tested. Needs `NUM_PROXIES=1` behind Render |
| Gemini model fallback and clear quota error | Falls back across `GEMINI_FALLBACK_MODELS` on daily-quota or overload; returns 503 "daily AI generation limit" when all are exhausted | `pytest tests/test_gemini_service.py tests/test_courses.py` | `6c691e9` | `evidence/final/backend_coverage.txt` | Behaviour is unit-tested; a live fallback was observed once (console only, not saved). Free tier = 20 requests/day **per model** |
| MongoDB lazy connect + `/health/` | Connects on first `/api/` request and retries every 5 s; `/health/` reports Mongo up/down | `pytest tests/test_mongo.py` | `648d587` | `evidence/final/backend_coverage.txt` | Observed live on 2026-10-09: `/health/` → `{"status":"ok","mongo":"up"}` (not saved to a file) |
| JWT authentication | Register, login, refresh with rotation, blacklist-on-logout are implemented and tested | `pytest tests/test_users.py` | `d2f18ab` | `evidence/final/backend_coverage.txt` | **Course endpoints are scoped by a client-supplied `X-Demo-User` header, not by the JWT**; say "JWT authentication", not "secured API" |
| Redis caching improved performance **by 26 %** | **NOT VERIFIED. Do not use.** | none | none | none | Replacement wording below |
| Real end-to-end generation time | **Not measured as a benchmark.** Anecdotal single runs (console only): 22.4 s and 26.3 s (`gemini-3.5-flash`), 50.8 s (`gemini-3.8-flash`) | `python -m bench.bench_real --gemini-runs N …` | `abaa134` | `evidence/real/real_api_bench.log` (0/10 succeeded: free-tier quota used up), `evidence/real/gemini_success_probe_transcript.txt` | Do not put these on a resume as a result |
| Live demo works end to end | **Confirmed by the project owner on 2026-10-09:** a course was generated from the live frontend after the deploy of `6c691e9`. The deployed backend also answered `/ping/`, `/health/` (Mongo up) and `/api/courses/` (200) | none | `6c691e9` | not saved (owner-reported; health checks observed in session) | Owner-reported, no saved artifact. Free-tier APIs can still fail (daily quota, overload), so re-check before sending an application |

## Replacement wording for weak claims

- Instead of *"Improved performance by 26 % with Redis caching"* →
  *"Added Redis caching for YouTube lookups and Gemini outlines; in a simulated-API benchmark a warm cache removed all 28 YouTube calls per course (p50 7.3 s → 3.0 s)."*
- Instead of *"secured with JWT authentication"* → *"JWT (SimpleJWT) authentication with refresh-token rotation and blacklist on logout"*.
- Avoid saying the app is "production-ready" or "scalable": it is a free-tier demo with header-based course scoping.

## Resume bullets (verified numbers only)

Pick three. The wording matches the table above.

1. **Testing and CI:** *Built a pytest and Vitest test suite (63 backend tests at 94 % coverage, 32 frontend tests) and a GitHub Actions pipeline that runs tests, lint, build and Docker build; testing and benchmarking uncovered a retired Gemini model, a logout and token-rotation bug, and a database connection that never recovered.*
2. **Performance:** *Cut course-generation latency 50 % in a simulated-API benchmark (p50 7.2 s → 3.6 s) by resolving 28 YouTube lookups concurrently with a bounded thread pool; on real YouTube calls, 20 lookups dropped from 16.5 s to 3.1 s.*
3. **Reliability and delivery:** *Added retries with backoff (success under 20 % injected failures 81 % → 99.5 %), hard time budgets, rate limiting and model fallback for a quota-limited free-tier API; shrank the Docker image 59 % (199 → 81 MB), halved build time, and moved to Gunicorn (≈6× throughput at 50 concurrent users).*

Optional, if space allows: *Stack: Django REST Framework, React, MongoDB, Redis, Gemini and YouTube APIs, JWT, Docker.*

Leave out until measured (fill in only with a saved result):
- Real end-to-end generation time, before → after: **[ ___ s → ___ s, n = ___ ]**
- Read-endpoint p50/p95 on a seeded dataset: **[ ___ ]** (not done)
- Users or demo sessions: **[ ___ ]** (unknown)

## Be ready to explain

- **"Is the 50 % real?"** It is measured with mocked Gemini and YouTube so only my code's behaviour is isolated. The real-YouTube run (5.3×) confirms the direction, and real Gemini time (22–51 s) dominates, so the end-to-end saving is smaller in absolute percentage.
- **The 26 % figure** could not be reproduced and was dropped.
- **Identity is demo-grade:** course data is scoped by a browser-generated header, not the login token (README roadmap).
- **Free-tier limits** shaped the design: 20 Gemini requests/day/model, ~100 YouTube quota units per search, so caching, throttling and model fallback exist for quota reasons.
