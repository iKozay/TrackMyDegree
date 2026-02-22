# k6 Timeline POC (local & container)

## Prereqs
- Backend running on `http://localhost:8000` (or set `BASE_URL`)
- Mongo running
- Redis running (used for `/api/jobs/:jobId` cache)
- **BullMQ worker running** (started by your backend)

## Required env vars
- `USER_ID` = valid Mongo ObjectId string (e.g., `696937568b34f8595e37f371`)

## Optional env vars
- `PDF_PATH` = path to PDF relative to script (default: `./test-pdfs/transcripts/Student Record.pdf`)
- `BASE_URL` = backend URL (default: `http://localhost:8000`)
- `POLL_MAX_SECONDS` = max seconds to poll jobs (default: `30`)

---

## How k6 works (general overview)

k6 is a load-testing tool that runs a JavaScript test file and executes a user flow repeatedly under a chosen load model.

### Core concepts
- **VUs (Virtual Users)**: concurrent “users” running your script in parallel.
- **Iteration**: one full execution of the script’s `default` function by a single VU.
- **Duration**: how long k6 keeps running the test. During that time, each VU loops the `default` function.
- **Checks**: assertions you define (pass/fail counters), without automatically failing the run unless you call `fail()`.
- **Thresholds** (optional): pass/fail criteria for metrics (e.g., p(95) latency, error rate).

### How load is defined
You can define load either:
- **From the CLI** (quick overrides), e.g.:
    - `k6 run --vus 20 --duration 1m script.js`
- **In the script** via `export const options = { ... }` (repeatable defaults)

When both are present, **CLI flags override script `options`**.

### Why request counts can vary
k6 reports total requests across all VUs and iterations. If your flow has retries, polling, conditional branches, or variable work per iteration, the total `http_reqs` and per-iteration request counts will vary.

---

## Run (local - from repo root)

## Start backend + worker locally
```bash
# Start MongoDB + Redis
docker compose up -d

# Start backend with worker (from Back-End/src)
cd Back-End/src
npm run dev
```
**Critical: The BullMQ worker (Back-End/src/workers/queue.ts) must be running for jobs to complete.**

**Minimal (uses defaults):**
```bash
export USER_ID="696937568b34f8595e37f371"
k6 run Back-End/performance/k6-timeline.js

```
** With custom PDF: **
```bash
cd Back-End/performance
export USER_ID="696937568b34f8595e37f371"
export PDF_PATH="./test-pdfs/transcripts/Student_Record.pdf"
export DEBUG=0 # set to 1 to log responses for debugging (can be verbose)
k6 run --vus 20 --duration 1m k6-timeline.js
```

** Run in Docker Container **
```bash
docker run --rm \
  --network=host \
  -v "$(pwd)/Back-End/performance:/scripts" \
  -e USER_ID="696937568b34f8595e37f371" \
  -e BASE_URL="http://localhost:8000" \
  grafana/k6 run /scripts/k6-timeline.js
```
## Make it a stress test
```bash
export USER_ID="696937568b34f8595e37f371"
export POLL_MAX_SECONDS=60
k6 run Back-End/performance/k6-timeline.js
```

---
## `k6-timeline.js` tests

This script exercises an asynchronous backend pipeline where work is queued, processed by a worker, cached, and later persisted. It performs a full CRUD cycle to test realistic user workflows.

### Flow per iteration
1. **Upload a PDF**
    - `POST /api/upload/file`
    - Expected behavior: backend accepts the upload and returns a `jobId`.

2. **Poll for upload job completion**
    - `GET /api/jobs/:jobId` (repeats until done or timeout)
    - Expected behavior:
        - `200`: response indicates processing is complete (status `done`) and contains timeline data
        - `404` / `410`: treated as "not ready yet / expired" while polling
        - `status=0`: network timeout or connection error (tracked separately)

3. **Save the resulting timeline**
    - `POST /api/timeline` with `{ userId, timelineName, jobId }`
    - Expected behavior: persists the computed result to MongoDB and returns timeline `_id`.
    - Important: this endpoint reads the cached result; if it is missing, it returns `410 result expired`.

4. **Retrieve the saved timeline**
    - `GET /api/timeline/:id`
    - Expected behavior: triggers an async job to fetch timeline data from DB, returns `jobId` with `202` status.

5. **Poll for retrieval job completion**
    - `GET /api/jobs/:jobId` (repeats until done or timeout)
    - Expected behavior: same polling behavior as step 2, returns complete timeline data when done.

6. **Delete the timeline (cleanup)**
    - `DELETE /api/timeline/:id`
    - Expected behavior: removes the test timeline from MongoDB to prevent database bloat.
    - Important: cleanup runs even if earlier steps fail to ensure test data doesn't accumulate.

### What this stresses under load
- **BullMQ worker throughput** (queue backlog if worker concurrency cannot keep up)
- **Redis cache behavior and TTL/expiry** (can surface `410 result expired` for slower processing)
- **MongoDB reads/writes** (saving and retrieving timelines at a higher rate)
- **End-to-end latency** across upload → processing → save → retrieve → delete
- **Error handling and recovery** (tracks all failure modes: 200, 410, 404, timeouts, network errors)
- **Resource cleanup** (ensures test data is properly deleted after each iteration)

### Custom metrics tracked
- **Job completion time**: `job_time_to_done_ms` (p95 < 3s target)
- **Job timeout rate**: `job_timeout_rate` (< 5% target)
- **Timeline save failures**: `timeline_save_failed_rate` (< 1% target for any non-201 status)
- **Iteration success rate**: `iteration_success_rate` (> 95% target for full flow completion)
- **Polling efficiency**: `polls_per_job` (tracks how many poll attempts per job)
- **Status code distribution**: separate counters for 200, 410, 404, timeouts, and network errors

---