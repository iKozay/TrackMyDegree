# k6 Performance Tests

Go to [running the tests](#running-the-tests) to set up your environment and run the tests.

## How k6 works (general overview)

k6 is a load-testing tool that runs a JavaScript test file and executes a user flow **repeatedly** under a chosen load model. Each VU (virtual user) runs the same flow in parallel, looping through the `default` function without pause until the test duration ends.
A single VU can generate a very high request rate; it will execute the requests as fast as the CPU and network allows without latency. 

### Core concepts
- **VUs (Virtual Users)**: parallel script runners that loop the `default` function as fast as possible unless you add `sleep()`; they are **not** equal to real people. Real users concurrently interact with the server whereas VUs are synchronized to hammer the server/endpoints constantly; each looping through the same iteration simultaneously for a set duration.
  -  **If a test fails at X VUs, this does not mean the system can only support X real users** — a single VU with no sleep time can generate the same traffic as many real users browsing at human speed. Look at the HTTP request rate (RPS), not the VU count, to understand real-world capacity.
- **Iteration**: one full execution of the script's `default` function by a single VU.
- **Duration**: how long k6 keeps running the test. During that time, each VU loops the `default` function.
- **Checks**: assertions you define (pass/fail counters), without automatically failing the run unless you call `fail()`.
- **Thresholds**: pass/fail criteria for metrics (e.g., p(95) latency, error rate).

### How load is defined
You can define load either:
- **From the CLI** (quick overrides): `k6 run --vus 20 --duration 1m script.js`
- **In the script** via `export const options = { ... }` (repeatable defaults)

When both are present, **CLI flags override script `options`**.

### Why request counts can vary
k6 reports total requests across all VUs and iterations. If your flow has retries, polling, conditional branches, or variable work per iteration, the total `http_reqs` and per-iteration request counts will vary.

---

## k6 internal concepts — what Grafana shows and why

This section explains k6 internals that directly affect what you see on the Grafana dashboard. Use it as a reference when a panel looks unexpected.

### Iterations: complete vs. interrupted

An iteration is one full execution of the `default` function. k6 distinguishes three outcomes:

| Outcome | What happened | Counted in `iteration_success_rate`? |
|---|---|---|
| **Complete + success** | All steps passed | ✅ as 1 |
| **Complete + failure** | A step failed, `fail()` or an error was returned | ✅ as 0 |
| **Interrupted** | k6 killed the VU mid-flow (test ended, `gracefulStop` expired) | ❌ not counted at all |

> **Why `iteration_success_rate` can read 100% even when you saw errors in the logs:**
> Interrupted iterations are excluded from every rate metric. If the test time ran out while VUs were still polling, those runs are silently dropped. Only fully-completed iterations are counted.

### `gracefulStop` and `gracefulRampDown`

When the test duration ends, k6 does not kill VUs instantly. It gives each VU time to finish its current iteration:

- **`gracefulStop`** (`30s` in this test): time the entire test waits after the scenario ends for any VU still mid-iteration to finish.
- **`gracefulRampDown`** (`30s` in this test): same, but applied when ramping VUs down to 0 mid-scenario.

If an iteration takes longer than these windows (e.g., polling for up to `POLL_MAX_SECONDS=60s` while the grace window is only `30s`), k6 forcibly terminates it. You will see:

```
N complete and M interrupted iterations
```

in the summary. Those `M` interrupted iterations do **not** appear in `iteration_success_rate` or any other rate metric — they are counted only in the raw `iterations` counter. This is why the dashboard may show all rates as healthy while the summary reports interruptions.

**To reduce interruptions:** increase `gracefulStop`/`gracefulRampDown` to be at least as long as `POLL_MAX_SECONDS`, or lower `POLL_MAX_SECONDS` so iterations finish faster.

### `http_req_failed` vs. custom failure rates

k6 has a built-in metric `http_req_failed` which counts requests that k6 considers failed. By default this means any non-2xx response **unless** you set `expected_response: false` on the request.

In this test, **all requests set `expected_response: false`** so that non-2xx responses can be handled explicitly (e.g., a `410` from the jobs endpoint is normal during polling). As a result:

- `http_req_failed` will show a high percentage (often 20–70%+) — this is **expected and misleading on its own**. It counts every poll response that was not 2xx, including normal `410` returns.
- The **custom rate metrics** (`upload_failed_rate`, `timeline_save_failed_rate`, etc.) are what actually measure real failures. Use those panels in Grafana, not `http_req_failed`.

### `status=0` — what it means and why it appears

When k6 logs a request with `status=0`, it means **no HTTP response was received at all**. This is a network-level failure, not an HTTP error code:

| Cause | Typical error string |
|---|---|
| Request timeout (exceeded `POLL_REQUEST_TIMEOUT`) | `request timeout` |
| Connection refused (backend not running) | `connection refused` |
| DNS failure | `no such host` |

In this test, `status=0` on poll requests is tracked via `poll_network_error_rate` and `poll_network_error_count`. A high `poll_network_error_rate` under load typically means the backend is overwhelmed and connections are timing out — it signals system stress, not a k6 configuration problem.

### `p(95)` — what percentiles mean

k6 thresholds and Grafana latency panels report values as percentiles:

- **`p(95)<500ms`** means "95% of requests completed in under 500ms". The slowest 5% are excluded.
- **`p(99)`** is stricter and captures more tail latency.
- **`avg`** is less useful for latency analysis because a few very slow requests inflate it; prefer `p(95)` or `p(99)` for thresholds.

> In Grafana, if a panel shows `p(95)=5s` for `GET /api/jobs/:jobId`, it means at least 5% of poll requests hit the `POLL_REQUEST_TIMEOUT` ceiling (5s) — the backend was not responding in time.

### Job-deadline exceeded

If k6 prints `job-deadline exceeded` in the terminal, it means a **k6-level** deadline was hit (the `gracefulStop` or scenario wall clock), **not** a BullMQ or backend job timeout. It is distinct from:

| Event | Tracked by | Means |
|---|---|---|
| `job_timeout_rate` fires | k6 custom metric | `pollJobUntilDone` exhausted `POLL_MAX_SECONDS` without the backend job completing — a backend problem |
| `poll_network_error_rate` fires | k6 custom metric | Individual poll requests received no HTTP response — a connectivity or overload problem |
| `job-deadline exceeded` logged | k6 internal | k6 forcibly killed a VU because the test's wall clock ran out — a test configuration problem (increase `gracefulStop`) |

### `410` during polling — expected or a problem?

`410 Gone` on `GET /api/jobs/:jobId` has two meanings depending on timing:

- **Early `410` (first poll attempt):** The job result already expired in Redis before polling started. This is a backend Redis TTL issue — the job completed too fast and the result was evicted before the client polled.
- **Repeated `410`:** The job result expired while the client was still polling. Under high load, this can surface if Redis TTL is shorter than the queue processing time.

Both are tracked in `poll_410_count` (counter on Grafana). They do **not** count as a job timeout — `job_timeout_rate` only fires when polling exhausted the full `POLL_MAX_SECONDS` without ever seeing `200 status=done`.

### Why Grafana panels may show "No Data"

| Cause | Fix |
|---|---|
| Test was run **without** `--out influxdb=...` | Always pass `--out influxdb=http://localhost:8086/k6` |
| InfluxDB container is not running | `docker compose up -d` |
| Time range in Grafana does not cover the test run | Set the Grafana time picker to the last 15 min or the exact window of the run |
| The metric was never triggered (e.g., no deletes happened) | Expected — "No Data" is correct if the code path was never reached |

### The InfluxDB flush warning

```
WARN: The flush operation took higher than the expected set push interval.
```

This means k6 is generating metrics faster than InfluxDB can ingest them. Under high VU counts (12+) or long runs, this can cause delayed or missing data points in Grafana. It does **not** affect the k6 terminal summary — only the Grafana visualisation. To reduce it:

- Lower `PEAK_VUS` for local testing
- Use a longer push interval: `--out "influxdb=http://localhost:8086/k6?pushInterval=5s&concurrentWrites=4"`
- Keep InfluxDB and the backend on the same machine to reduce network overhead

---

## File structure

```
Back-End/performance/
├── k6-timeline.js              # Entry point: timeline CRUD flow (options, setup, teardown, default)
├── k6-coop-validation.js       # Entry point: coop validation flow (options, setup, teardown, default)
├── k6-degree-audit.js          # Entry point: degree audit flow (options, setup, teardown, default)
├── config.js                   # Env vars, shared constants, PDF file map, getPdfForVU, pollJobUntilDone
├── metrics.js                  # All custom k6 metric declarations
├── users.js                    # createTestUser / deleteTestUser (setup/teardown)
├── timeline.js                 # uploadPdf, saveTimeline, updateTimeline,
│                               #   retrieveTimeline, deleteTimeline
├── grafana/
│   └── dashboards/
│       ├── k6-timeline-dashboard.json        # Grafana dashboard for k6-timeline.js
│       ├── k6-coop-validation-dashboard.json # Grafana dashboard for k6-coop-validation.js
│       └── k6-degree-audit-dashboard.json    # Grafana dashboard for k6-degree-audit.js
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

---

## Running the tests

## Prerequisites

### 1. Install k6

k6 is a standalone binary — it is **not** an npm package and cannot be installed via `npm install`.

**Windows (winget):**
```cmd
winget install k6 --source winget
```

**Windows (Chocolatey):**
```cmd
choco install k6
```

**macOS (Homebrew):**
```bash
brew install k6
```

**Linux (Debian/Ubuntu):**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

Verify the installation:
```bash
k6 version
```

> Full install docs: https://grafana.com/docs/k6/latest/set-up/install-k6/

### 2. Backend and infrastructure
- Backend running on `http://localhost:8000` (or set `BASE_URL`)
- MongoDB running
- Redis running (used for `/api/jobs/:jobId` cache)
- **BullMQ worker running** (started by your backend)
- InfluxDB + Grafana running via `docker compose -f docker-compose.test.yml up -d` (for metrics visualisation)

> **Note:** A test user is created automatically by `setup()` before the run and deleted by `teardown()` after. No manual user setup needed.

---

```bash
# From repo root — start MongoDB, Redis (dev stack)
docker compose up -d

# From repo root — start InfluxDB, Grafana
docker compose -f docker-compose.test.yml up -d

# Start backend with BullMQ worker
cd Back-End/src
npm run dev
```

> **Critical:** The BullMQ worker must be running for jobs to complete.

### Running the tests

All tests follow the same command pattern from the `Back-End/performance` directory:

```bash
cd Back-End/performance
# Default load test - refer to notes below for default VU counts per script
k6 run --out influxdb=http://localhost:8086/k6 <script>
```

| Test | Script | Default `PEAK_VUS` | Notes |
|---|---|--------------------|---|
| Timeline CRUD | `k6-timeline.js` | `6`                | Use multiples of 6 for even PDF coverage across all 6 files |
| Coop Validation | `k6-coop-validation.js` | `10`               | Single shared timeline; stresses retrieval job + validation logic |
| Degree Audit | `k6-degree-audit.js` | `6`                | Use multiples of 3 for even coverage across all transcript types (coop, ecp, regular) |

**Smoke test** — quick sanity check with a short run (works for any script):
```bash
k6 run --out influxdb=http://localhost:8086/k6 \
  -e PEAK_VUS=6 -e RAMP_DURATION=10s -e STEADY_DURATION=30s \
  <script>
```

**Higher load (example for 12 VUs)**
```bash
k6 run --out influxdb=http://localhost:8086/k6 \
  -e PEAK_VUS=12 -e RAMP_DURATION=2m -e STEADY_DURATION=5m \
  <script>
```

**Verbose logging** (no InfluxDB output needed for debugging):
```bash
k6 run -e DEBUG=1 <script>
```

#### Timeline-specific: pin to a single PDF
```bash
k6 run --out influxdb=http://localhost:8086/k6 \
  -e DOC_TYPE=transcript -e FILE_NAME=transcript-coop \
  k6-timeline.js
```

> The default `PEAK_VUS=6` for `k6-timeline.js` gives exactly one VU per PDF file. Use a multiple of 6 (12, 18, …) for higher load while keeping PDF coverage even.

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

### PDF selection

#### Default — full deterministic rotation

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

---

## `k6-coop-validation.js` test flow

This script stress-tests the synchronous coop validation endpoint. Unlike the timeline flow, coop validation itself is **not** async — `GET /api/coop/validate/:jobId` runs validation inline and returns `200` immediately with the result. The async work in this flow is the **retrieval job** that loads the timeline into Redis cache before validation can run.

A single timeline is uploaded and saved once in `setup()` and shared across all VUs for the duration of the test. Each VU repeatedly retrieves that timeline, polls until the retrieval job is done, then calls coop validate against the cached result.

### Setup (runs once before all VUs)

1. **Create test user** — `POST /api/users` → `userId`
2. **Upload coop transcript PDF** — `POST /api/upload/file` → `jobId`
3. **Poll upload job** — `GET /api/jobs/:jobId` until `status=done`
4. **Save timeline** — `POST /api/timeline` with `userId` + `jobId` → `timelineId`

The `timelineId` is passed to every VU via `data`.

### Flow per iteration

1. **Retrieve the shared timeline**
    - `GET /api/timeline/:id`
    - Expected: triggers an async retrieval job, returns `202` with a `jobId`.

2. **Poll for retrieval job completion**
    - `GET /api/jobs/:jobId` (repeats until done or timeout)
    - Expected:
        - `200`: timeline data is now in Redis cache, ready for validation
        - `404` / `410`: not ready yet / expired — keeps polling
        - `status=0`: network timeout or connection error (tracked separately)

3. **Run coop validation**
    - `GET /api/coop/validate/:jobId`
    - Expected: reads the cached timeline from Redis, runs validation synchronously, returns `200` with the result.
    - Note: this endpoint is **synchronous** — no further polling needed.

### Teardown (runs once after all VUs)

- **Delete shared timeline** — `DELETE /api/timeline/:id`
- **Delete test user** — `DELETE /api/users/:id`


### What this stresses under load

- **Timeline retrieval job throughput** (many VUs triggering retrieval jobs for the same timeline simultaneously)
- **Redis cache population and read latency** (coop validate reads from the same cache slot that the retrieval job writes)
- **Coop validation logic throughput** (`validateCoopTimeline` is CPU-bound; high VUs test its concurrency under Node.js)
- **Poll infrastructure** (same BullMQ + Redis polling path as the timeline flow)

### Custom metrics tracked

**Trends (timing)**
- `job_time_to_done_ms` — time from retrieval job accepted to `status=done`, includes queue wait + worker processing (p95 < 3s target)
- `polls_per_job` — number of `GET /api/jobs/:jobId` poll attempts before the retrieval job completed

**Rates (pass/fail thresholds)**
- `iteration_success_rate` — rate of iterations where retrieve + poll + coop validate all succeeded (> 95% target)
- `coop_validation_failed_rate` — rate of `GET /api/coop/validate/:jobId` responses that were not `200` or returned no result (< 1% target)
- `poll_network_error_rate` — rate of poll attempts that received no HTTP response (`status=0`) (< 5% target)
- `job_timeout_rate` — rate of poll loops that exhausted `POLL_MAX_SECONDS` without the retrieval job completing (< 5% target)

**Counters (raw event counts, shared with timeline flow)**
- `poll_200_count` — poll attempts that returned `200 status=done`
- `poll_410_count` — poll attempts that returned `410` (job result expired or not ready)
- `poll_404_count` — poll attempts that returned `404`
- `poll_network_error_count` — poll attempts that received no response (`status=0`)
- `poll_timeout_count` — poll loops that hit the `POLL_MAX_SECONDS` deadline
- `poll_other_count` — poll attempts with any other unexpected status code

### Grafana dashboard

Open the **"k6 Coop Validation Performance Test"** dashboard (`uid: k6-coop-validation`) in Grafana. It mirrors the layout of the timeline dashboard with panels specific to the coop flow:

| Section | Panels |
|---|---|
| Overview | Virtual Users, HTTP Requests Rate |
| Health Rates | Iteration Success Rate, Coop Validation Failed Rate, Poll Network Error Rate, Job Deadline Exceeded Rate |
| Job Processing | Retrieval Job Time p95/avg, Poll Attempts Per Retrieval Job p95/avg |
| Endpoint Latency | p95 for `GET /api/timeline/:id`, `GET /api/jobs/:jobId`, `GET /api/coop/validate/:id` |
| Poll Status Breakdown | Cumulative poll status counts, per-second stacked poll rate |

---

## `k6-degree-audit.js` test flow

This script stress-tests all three degree audit endpoints in a single iteration. Unlike the coop validation flow which targets one endpoint, each iteration exercises three different audit routes back-to-back so their performance can be compared under the same load.

Three timelines are created in `setup()` — one per transcript type (coop, ecp, regular) — and shared across all VUs. Each VU is **pinned to one transcript type for the full test duration**. This means all three transcript types are stressed **simultaneously** under load, not cycled through per iteration by a single VU.

> **Note on `auditByUser` (step 5):** this route always resolves the most recently updated timeline for the shared `userId`, regardless of which timeline the VU was assigned. Under concurrent load, that will be whichever of the three timelines was last touched.

### Why three audit routes?

| Route | Input | What it does |
|---|---|---|
| `GET /api/audit/timeline/job/:jobId` | Redis cache `jobId` | Reads the cached timeline result from Redis and runs the audit inline — no DB reads |
| `GET /api/audit/timeline/:timelineId` | MongoDB `_id` + `?userId=` | Fetches timeline + user + degree data from MongoDB, then runs the audit |
| `GET /api/audit/user/:userId` | userId | Resolves the user's most recently updated timeline from MongoDB first, then follows the same path as above |

Testing all three in the same iteration isolates what each route costs under the same conditions: Redis-only vs. MongoDB-backed, and whether the extra "find latest timeline" step in the user route adds meaningful latency.

### Setup (runs once before all VUs)

1. **Create test user** — `POST /api/users` → `userId`
2. For each transcript type (coop, ecp, regular):
   - **Upload PDF** — `POST /api/upload/file` → `jobId`
   - **Poll upload job** — `GET /api/jobs/:jobId` until `status=done`
   - **Save timeline** — `POST /api/timeline` with `userId` + `jobId` → `timelineId`

All three `timelineIds` and the shared `userId` are passed to every VU via `data`.

### Flow per iteration

Each VU runs the following five steps against its pinned timeline:

1. **Retrieve the assigned timeline**
    - `GET /api/timeline/:id`
    - Expected: triggers an async retrieval job, returns `202` with a `jobId`.

2. **Poll for retrieval job completion**
    - `GET /api/jobs/:jobId` (repeats until done or timeout)
    - Expected: `200 status=done` once the timeline is in Redis cache.

3. **Audit via jobId** — `GET /api/audit/timeline/job/:jobId`
    - Reads the cached result from Redis and runs the audit inline.
    - Fastest path — no DB reads.

4. **Audit via timelineId** — `GET /api/audit/timeline/:timelineId?userId=`
    - Fetches from MongoDB (timeline + user + degree data), then runs the audit.

5. **Audit via userId** — `GET /api/audit/user/:userId`
    - Resolves the most recently updated timeline for the user from MongoDB, then same path as step 4.

Steps 3–5 always run regardless of each other's outcome — a failure in one does not skip the others, so latency samples are always collected for all three routes.

### Teardown (runs once after all VUs)

- **Delete all three timelines** — `DELETE /api/timeline/:id` (× 3)
- **Delete test user** — `DELETE /api/users/:id`

### What this stresses under load

- **Redis cache read latency** (`audit/job` reads from the same cache slot the retrieval job wrote)
- **MongoDB query performance** under concurrent audit requests (`audit/timeline` and `audit/user`)
- **Audit computation throughput** (`generateDegreeAuditFromTimeline` and `generateDegreeAudit` run synchronously on each request)
- **Varied input complexity** — all three transcript types (coop, ecp, regular) are audited simultaneously, exercising different course/semester configurations through the audit logic
- **Poll infrastructure** (same BullMQ + Redis polling path as the other flows)

### Custom metrics tracked

**Trends (timing)**
- `job_time_to_done_ms` — time from retrieval job accepted to `status=done` (p95 < 3s target)
- `polls_per_job` — number of `GET /api/jobs/:jobId` poll attempts before the retrieval job completed

**Rates (pass/fail thresholds)**
- `iteration_success_rate` — rate of iterations where all five steps passed (> 95% target)
- `audit_by_job_failed_rate` — rate of `GET /api/audit/timeline/job/:jobId` failures (< 1% target)
- `audit_by_timeline_failed_rate` — rate of `GET /api/audit/timeline/:timelineId` failures (< 1% target)
- `audit_by_user_failed_rate` — rate of `GET /api/audit/user/:userId` failures (< 1% target)
- `poll_network_error_rate` — rate of poll attempts with no HTTP response (`status=0`) (< 5% target)
- `job_timeout_rate` — rate of poll loops that exhausted `POLL_MAX_SECONDS` (< 5% target)

**Counters (raw event counts, shared with other flows)**
- `poll_200_count`, `poll_410_count`, `poll_404_count`, `poll_network_error_count`, `poll_timeout_count`, `poll_other_count`

### Grafana dashboard

Open the **"k6 Degree Audit Performance Test"** dashboard (`uid: k6-degree-audit`) in Grafana:

| Section | Panels |
|---|---|
| Overview | Virtual Users, HTTP Requests Rate |
| Health Rates | Iteration Success Rate, Audit by Job Failed Rate, Audit by Timeline Failed Rate, Audit by User Failed Rate, Poll Network Error Rate, Job Deadline Exceeded Rate |
| Job Processing | Retrieval Job Time p95/avg, Poll Attempts Per Retrieval Job p95/avg |
| Endpoint Latency | All routes overview (p95), then one panel each for Audit by Job / Timeline / User (p95 + avg) |
| Poll Status Breakdown | Cumulative poll status counts, per-second stacked poll rate |
