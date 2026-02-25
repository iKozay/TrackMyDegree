# k6 Timeline Performance Tests

## Prerequisites
- Backend running on `http://localhost:8000` (or set `BASE_URL`)
- MongoDB running
- Redis running (used for `/api/jobs/:jobId` cache)
- **BullMQ worker running** (started by your backend)

> **Note:** A test user is created automatically by `setup()` before the run and deleted by `teardown()` after. No manual user setup needed.

---

## File structure

```
Back-End/performance/
├── k6-timeline.js         # Entry point: options, setup, teardown, default flow
├── config.js              # Env vars, shared constants, PDF file map, getPdfForVU
├── metrics.js             # All custom k6 metric declarations
├── users.js               # createTestUser / deleteTestUser (setup/teardown)
├── timeline.js            # uploadPdf, pollJobUntilDone, saveTimeline, updateTimeline,
│                          #   retrieveTimeline, deleteTimeline
└── test-pdfs/
    ├── transcripts/
    │   ├── transcript-coop.pdf
    │   ├── transcript-ecp.pdf
    │   └── transcript-regular.pdf
    └── acceptance-letters/
        ├── acceptance-letter-coop.pdf
        ├── acceptance-letter-ecp.pdf
        └── acceptance-letter-regular.pdf
```

---

## Environment variables

> **Note:** k6 does not read `.env` files. Variables must be passed explicitly via `-e KEY=VALUE`
> on the CLI, or exported in your shell before running k6. The defaults in `config.js` are
> sized for local development (`BASE_URL=http://localhost:8000`, `BACKEND_PORT=8000`) and
> match the values in `secrets/.env`, so no extra flags are needed for a standard local run.

| Variable                | Default                 | Description                                              |
|-------------------------|-------------------------|----------------------------------------------------------|
| `BASE_URL`              | `http://localhost:8000` | Backend base URL                                         |
| `TIMELINE_NAME_PREFIX`  | `k6-poc`                | Prefix for generated timeline names                      |
| `PEAK_VUS`              | `6`                     | Number of VUs at peak load (use a multiple of 6 for even PDF coverage) |
| `RAMP_DURATION`         | `1m`                    | Duration of each ramp-up and ramp-down stage             |
| `STEADY_DURATION`       | `3m`                    | Duration of the steady peak load stage                   |
| `POLL_MAX_SECONDS`      | `60`                    | Max seconds to poll a job before timeout                 |
| `POLL_INTERVAL_SECONDS` | `1`                     | Seconds between poll attempts                            |
| `POLL_REQUEST_TIMEOUT`  | `5s`                    | Per-request timeout for poll calls                       |
| `DEBUG`                 | `0`                     | Set to `1` to enable verbose logging                     |
| `DOC_TYPE`              | *(rotation)*            | Pin to `transcript` or `acceptance_letter` (see below)   |
| `FILE_NAME`             | *(rotation)*            | Pin to a specific file prefix e.g. `transcript-coop`     |

---

## PDF selection

### Default — full deterministic rotation

All 6 files are covered across VUs. The VU-to-file assignment is fixed and never random:

| VU | `DOC_TYPE`          | File used                        |
|----|---------------------|----------------------------------|
| 1  | `transcript`        | `transcript-coop.pdf`            |
| 2  | `transcript`        | `transcript-ecp.pdf`             |
| 3  | `transcript`        | `transcript-regular.pdf`         |
| 4  | `acceptance_letter` | `acceptance-letter-coop.pdf`     |
| 5  | `acceptance_letter` | `acceptance-letter-ecp.pdf`      |
| 6  | `acceptance_letter` | `acceptance-letter-regular.pdf`  |

With more than 6 VUs the pattern repeats (VU 7 = same as VU 1, etc.).

> To exercise all 6 files evenly, run with `-e VUS=6` (or a multiple of 6).

### Pin to a specific file

Set both `DOC_TYPE` and `FILE_NAME` — all VUs will use that exact file:

```bash
# transcript-coop.pdf
k6 run -e DOC_TYPE=transcript -e FILE_NAME=transcript-coop k6-timeline.js

# transcript-ecp.pdf
k6 run -e DOC_TYPE=transcript -e FILE_NAME=transcript-ecp k6-timeline.js

# transcript-regular.pdf
k6 run -e DOC_TYPE=transcript -e FILE_NAME=transcript-regular k6-timeline.js

# acceptance-letter-coop.pdf
k6 run -e DOC_TYPE=acceptance_letter -e FILE_NAME=acceptance-letter-coop k6-timeline.js

# acceptance-letter-ecp.pdf
k6 run -e DOC_TYPE=acceptance_letter -e FILE_NAME=acceptance-letter-ecp k6-timeline.js

# acceptance-letter-regular.pdf
k6 run -e DOC_TYPE=acceptance_letter -e FILE_NAME=acceptance-letter-regular k6-timeline.js
```

---

## Load scenario

The test uses a **ramping-vus** scenario — no flat constant load. Every run follows the same three-stage shape:

```
VUs
^
|        ___________
|       /           \
|      /             \
|_____/               \____
|
+---+---+---+---+---+----> time
  ramp-up  steady  ramp-down
  (1m)     (3m)    (1m)
```

| Stage | Default duration | VUs |
|---|---|---|
| Ramp-up | `RAMP_DURATION` = `1m` | 0 → `PEAK_VUS` |
| Steady load | `STEADY_DURATION` = `3m` | `PEAK_VUS` |
| Ramp-down | `RAMP_DURATION` = `1m` | `PEAK_VUS` → 0 |

- **Ramp-up** mirrors real traffic building gradually as users start their session — avoids a thundering herd and lets you see at what VU count the system starts degrading
- **Steady load** is the measurement window — thresholds are evaluated over the full run including this phase
- **Ramp-down** catches delayed failures (e.g., jobs still processing, cleanup errors) and lets in-flight iterations finish gracefully

> The default `PEAK_VUS=6` gives exactly one VU per PDF file via the deterministic rotation. Use a multiple of 6 (12, 18, ...) for higher load while keeping PDF coverage even.

---

## Running the tests

### 1. Start the backend and dependencies

```bash
# From repo root — start MongoDB, Redis, InfluxDB, Grafana
docker compose up -d

# Start backend with BullMQ worker
cd Back-End/src
npm run dev
```

> **Critical:** The BullMQ worker must be running for jobs to complete.

### 2. Run k6

```bash
cd Back-End/performance
```

**Default — ramp up to 6 VUs, hold 3 min, ramp down (total ~5 min):**
```bash
k6 run  k6-timeline.js
```

**Quick smoke test — small peak, short stages:**
```bash
k6 run --out \
  -e PEAK_VUS=6 -e RAMP_DURATION=10s -e STEADY_DURATION=30s \
  k6-timeline.js
```

**Higher load — 12 VUs (2 VUs per PDF):**
```bash
k6 run \
  -e PEAK_VUS=12 -e RAMP_DURATION=2m -e STEADY_DURATION=5m \
  k6-timeline.js
```

**Pin to a specific file:**
```bash
k6 run \
  -e DOC_TYPE=transcript -e FILE_NAME=transcript-coop \
  k6-timeline.js
```

**With verbose logging:**
```bash
k6 run -e DEBUG=1 k6-timeline.js
```

---

## How k6 works (general overview)

k6 is a load-testing tool that runs a JavaScript test file and executes a user flow repeatedly under a chosen load model.

### Core concepts
- **VUs (Virtual Users)**: concurrent "users" running your script in parallel.
- **Iteration**: one full execution of the script's `default` function by a single VU.
- **Duration**: how long k6 keeps running the test. During that time, each VU loops the `default` function.
- **Checks**: assertions you define (pass/fail counters), without automatically failing the run unless you call `fail()`.
- **Thresholds** (optional): pass/fail criteria for metrics (e.g., p(95) latency, error rate).

### How load is defined
You can define load either:
- **From the CLI** (quick overrides): `k6 run --vus 20 --duration 1m script.js`
- **In the script** via `export const options = { ... }` (repeatable defaults)

When both are present, **CLI flags override script `options`**.

### Why request counts can vary
k6 reports total requests across all VUs and iterations. If your flow has retries, polling, conditional branches, or variable work per iteration, the total `http_reqs` and per-iteration request counts will vary.

---

## `k6-timeline.js` test flow

This script exercises an asynchronous backend pipeline where work is queued, processed by a worker, cached, and later persisted. It performs a full CRUD cycle to test realistic user workflows.

### Flow per iteration
1. **Upload a PDF**
   - `POST /api/upload/file`
   - Expected: backend accepts the upload and returns a `jobId`.

2. **Poll for upload job completion**
   - `GET /api/jobs/:jobId` (repeats until done or timeout)
   - Expected:
     - `200`: processing complete, contains timeline data
     - `404` / `410`: not ready yet / expired — keeps polling
     - `status=0`: network timeout or connection error (tracked separately)

3. **Save the resulting timeline**
   - `POST /api/timeline` with `{ userId, timelineName, jobId }`
   - Expected: persists the computed result to MongoDB and returns timeline `_id`.
   - Note: reads from Redis cache — if missing, returns `410 result expired`.

4. **Retrieve the saved timeline**
   - `GET /api/timeline/:id`
   - Expected: triggers an async job to fetch timeline data from DB, returns `jobId` with `202`.

5. **Poll for retrieval job completion**
   - `GET /api/jobs/:jobId` (repeats until done or timeout)
   - Expected: same polling behavior as step 2.

6. **Delete the timeline (cleanup)**
   - `DELETE /api/timeline/:id`
   - Expected: removes the test timeline from MongoDB.
   - Note: cleanup runs even if earlier steps fail.

### What this stresses under load
- **BullMQ worker throughput** (queue backlog if worker concurrency cannot keep up)
- **Redis cache behavior and TTL/expiry** (can surface `410 result expired` for slower processing)
- **MongoDB reads/writes** (saving and retrieving timelines at a higher rate)
- **End-to-end latency** across upload → processing → save → retrieve → delete
- **Error handling and recovery** (tracks all failure modes: 200, 410, 404, timeouts, network errors)
- **Resource cleanup** (ensures test data is properly deleted after each iteration)

### Custom metrics tracked

**Trends (timing)**
- `job_time_to_done_ms` — end-to-end time from upload accepted to job `status=done`, includes queue wait + worker processing (p95 < 3s target)
- `polls_per_job` — number of `GET /api/jobs/:jobId` attempts before a job completed

**Rates (pass/fail thresholds)**
- `iteration_success_rate` — rate of iterations that completed all steps without any error or network failure (> 95% target)
- `poll_network_error_rate` — rate of poll attempts that received no HTTP response (`status=0`), covers request timeouts and connection errors (< 5% target)
- `job_timeout_rate` — rate of poll loops that exhausted the full `POLL_MAX_SECONDS` deadline without the job completing; distinct from network errors — fires only when the job itself never finishes (< 5% target)
- `upload_failed_rate` — rate of `POST /api/upload/file` responses that were not `200` (< 1% target)
- `delete_failed_rate` — rate of `DELETE /api/timeline/:id` responses that were not `200` (< 1% target)
- `timeline_save_failed_rate` — rate of `POST /api/timeline` responses that were not `201` (< 1% target)
- `timeline_update_failed_rate` — rate of `PUT /api/timeline/:id` responses that were not `200` (< 1% target)

**Counters (raw event counts)**
- `poll_200_count` — poll attempts that returned `200 status=done`
- `poll_410_count` — poll attempts that returned `410` (job result expired or not ready)
- `poll_404_count` — poll attempts that returned `404`
- `poll_network_error_count` — poll attempts that received no response (`status=0`)
- `poll_timeout_count` — poll loops that hit the `POLL_MAX_SECONDS` deadline
- `poll_other_count` — poll attempts with any other unexpected status code
