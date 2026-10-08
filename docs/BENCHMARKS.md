# Benchmarks

Every number here comes from a command whose raw output is saved under `docs/evidence/`. Environment:
[`docs/evidence/environment.md`](evidence/environment.md) (single Windows laptop, i7-12700H, 20 logical CPUs, 16 GB, Docker Desktop VM 20 CPUs / 7.6 GB; other containers were running, so treat absolute numbers as relative).

**Labels used below**
- **SIM** = simulated external APIs (Gemini and YouTube mocked with fixed latency; MongoDB replaced by `mongomock`). Isolates my code; **not** real end-to-end latency.
- **REAL** = real Gemini / YouTube calls with my keys.
- **DERIVED** = arithmetic on measured components, not itself measured. Do not quote as a measurement.

Baseline = git tag `baseline-benchmark` (`f68b9c6`: the repo after fixing the broken Gemini service and adding tests/CI, before any optimisation).
Benchmarks started at this commit because the previous working tree could not generate a course at all (see *Fixes found along the way*).

---

## 1. Course generation, own-code cost (SIM)

`python -m bench.bench_generation` (`backend/bench/bench_generation.py`)
Course shape 7 modules × 4 subtopics = **28 YouTube lookups**; Gemini mocked at **3.0 s**, YouTube at **0.15 s/call**; 30 measured runs after 2 warm-ups; parameters fixed in advance.

| Scenario | Baseline p50 / p95 | After concurrency p50 / p95 | Change (p50) |
|---|---|---|---|
| No cache | 7.231 s / 7.248 s | 3.619 s / 3.627 s | **−50.0 %** |
| YouTube cache cold (empty Redis each run) | 7.279 s / 7.294 s | 3.611 s / 3.612 s | −50.4 % |
| YouTube cache warm | 3.011 s / 3.027 s | 3.007 s / 3.010 s | ≈0 (nothing left to parallelise) |
| All caches warm (Gemini + YouTube) | 0.011 s / 0.013 s | 0.006 s / 0.007 s | ms-scale, not claimed |

- YouTube calls per course: 28 sequential (peak concurrency **1**) → 28, up to **8** at a time. Concurrency does not reduce calls; the cache does (warm cache: 28 → 0, 100 % avoided).
- Own-code time after removing the mocked Gemini 3.0 s: 4.23 s → 0.62 s (−85 %).
- Re-run at the final HEAD (`f0254df`, includes retries/throttle/etc.): no-cache p50 **3.610 s**: no regression (`evidence/final/`).
- Evidence: `evidence/baseline/generation_bench.*` (commit `5afb01b`), `evidence/after_concurrent_youtube/` (`2fb164a`), `evidence/final/` (`f0254df`).

**Cache effect, same code (SIM):** cold → warm YouTube cache p50 7.279 s → 3.011 s = **−58.6 %** at 0.15 s/lookup. This is the closest thing to the old "Redis" claim, and it is **not 26 %**. It depends entirely on the assumed latencies, so it is only meaningful with the REAL numbers in §4.

## 2. Reliability under injected failures (SIM)

`python -m bench.bench_resilience`: seeded RNG, 2000 trials, each attempt fails with probability 20 % (YouTube: HTTP 503; Gemini: malformed JSON or `ServiceUnavailable`). Backoff sleeps skipped.

| | Baseline (`04e07d6`) | After retries (`7d36d4e`) |
|---|---|---|
| YouTube lookup success | 81.0 % | **99.5 %** |
| Gemini generation success | 81.0 % | **99.5 %** |
| Mean attempts per call | 1.00 | 1.22 |

At a 50 % failure rate: 88.5 % success, 1.72 attempts/call (`evidence/after_retries/resilience_50pct.json`). These are simulated faults, not real API failure rates.

## 3. Docker image and server (REAL builds / REAL load, trivial endpoints)

Builds: `bash backend/bench/docker_measure.sh <ref> <out>`: clean `git worktree` checkout, `--no-cache`, 3 runs. (My first baseline accidentally included a local `.venv`; it is kept as `docker_build_INVALID_contaminated.txt` and not used.)

| Metric | Baseline `f68b9c6` | After `27589da` | Change |
|---|---|---|---|
| Build time (3 runs) | 99 / 91 / 88 s (median 91) | 43 / 46 / 52 s (median 46) | ≈ −49 % |
| Image size, `docker image inspect` | 198.5 MB | 80.8 MB | **−59.3 %** |
| Image size, `docker images` (disk usage) | 854 MB | 375 MB | −56.1 % |

What changed: multi-stage build, no apt toolchain / postgres client, unused Pillow removed, `.dockerignore` tightened, **Gunicorn** (3 workers × 4 threads) instead of `runserver`.

Load (k6 in Docker, `GET /ping/` + `GET /api/courses/` returning an empty list from real Mongo 7, 20 s per level):

| Virtual users | `runserver` (baseline image) | Gunicorn (new image) |
|---|---|---|
| 1 | 22 req/s, p95 47.9 ms | 826 req/s, p95 1.8 ms |
| 10 | 223 req/s, p95 48.1 ms | 3327 req/s, p95 5.3 ms |
| 50 | 573 req/s, p95 115.8 ms | 3382 req/s, p95 21.5 ms |

Quote the **50-VU row (~5.9× throughput)**. `runserver`'s ~44 ms floor at one user is a per-connection artifact that exaggerates the low-concurrency gap. Endpoints are trivial and the database is empty, so this measures server overhead only, **not** seeded read performance. Evidence: `evidence/after_docker/`.

## 4. Real APIs (REAL): partial, with an unplanned finding

`python -m bench.bench_real` (never touches MongoDB or Redis).

**YouTube (REAL, `evidence/real/youtube_real.json`, commit `a19371b`):** realistic made-up lesson queries, caches bypassed.
- Per-call latency, 20 sequential calls: mean **0.826 s**, p50 0.816, p95 0.900, min 0.693, max 0.964, stdev 0.062.
- 20 lookups sequential: **16.5 s**; 20 lookups concurrent (8 workers): **3.1 s** (−81 %, 5.3×). One run each (wall time), different query strings in each group; all 40 resolved.
- YouTube is therefore ~5× slower per call than the 0.15 s I simulated; the simulated percentages understate the absolute seconds saved.

**Gemini (REAL):** the planned 10 generations **failed (0/10)**: `evidence/real/real_api_bench.log`.
- Runs 1–2: model overloaded (503 / deadline) after 60–90 s.
- Runs 3–10: `429 … GenerateRequestsPerDayPerProjectPerModel-FreeTier, limit: 20`. My earlier probe calls plus these runs used up the **free-tier allowance of 20 generate requests per day per model**.
- One earlier successful probe (console transcript only, n = 1, `evidence/real/gemini_success_probe_transcript.txt`): **50.8 s**, 7 modules, 25 subtopics. This is anecdotal, not a benchmark. **Repeat this run after the daily quota resets.**

**DERIVED (not measured; Gemini n = 1):** real cold generation ≈ 50.8 s (Gemini) + 28 × 0.83 s (YouTube, sequential) ≈ 74 s; Gemini dominates. Under that model, concurrent lookups would give ≈ 54 s (−27 %) and a warm YouTube cache ≈ 51 s (−31 %). That puts the real-world benefit of both changes in the 25–30 % range, which may be where the original "26 %" came from, but nothing saved reproduces 26 % and it must not be claimed until the real end-to-end run is repeated.

## 5. Tests and coverage

| Package | Tests | Coverage (lines) | Evidence |
|---|---|---|---|
| Backend (pytest, `courses`+`users`+`utils`) | **53** | **93 %** | `evidence/final/backend_coverage.txt` |
| Frontend (Vitest) | **19** | **37.6 %** overall; key flows: AddCourse 97 %, CoursePage 96 %, AuthContext 89 %, ProtectedRoute 100 %, api.js 91 % | `evidence/final/frontend_coverage.txt` |

Backend tests mock Gemini/YouTube, use `mongomock` + `fakeredis`; frontend mocks the API module. Index/`explain()` behaviour on real MongoDB is **not** covered by any test.

---

## Fixes found along the way (not performance, but material)

- Course generation was broken in the working tree (`AttributeError`: missing `_generate_gemini_course`).
- The hard-coded Gemini model `gemini-2.0-flash-exp` returns 404 (retired); `gemini-2.5-flash` is closed to new users. Now configurable (`GEMINI_MODEL`, default `gemini-3.8-flash`). **Any deployment built from the old code cannot generate courses until this is applied.**
- My retries + the SDK's own 60 s internal retry could exceed Gunicorn's 120 s worker timeout (observed a 182 s call). Calls now have a hard 90 s budget.
- Daily-quota 429s are no longer retried (it only burns the 20/day quota); the global throttle defaults to 20/day.
- Logout returned 400 and rotated refresh tokens stayed valid (blacklist app not installed); fixed with a migration and a frontend change.
- `DEBUG` defaulted to on; error responses leaked exception text.

## Limitations

- SIM numbers use mocked latencies I chose; ratios depend on them. REAL numbers cover YouTube only (n = 20 per group), and Gemini only anecdotally (n = 1).
- Single machine, other workloads running; no repeated-day variance. Docker builds used the local layer/registry cache for base images.
- Load tests hit trivial endpoints with an empty database. **Not done:** seeded dataset (1,000 users / 10,000 courses), `explain()` on real MongoDB, compound index, pagination, concurrent-toggle fix.
- Throttling and `NUM_PROXIES` are unit-tested only, not load-tested.
- The live deployment was not tested (backend host unconfirmed; probably Render per commit history).
