# Performance Testing Report — Timeline API

## Overview

Five load scenarios were run against the Timeline API to establish a performance baseline, measure behaviour under expected production load, and identify stress limits. Each scenario executes the full user workflow:

> Upload transcript → poll job until done → save timeline → update timeline → retrieve timeline → delete timeline

---

## Test Scenarios

| Scenario | Max VUs | Duration | Purpose |
|---|---|---|---|
| Default | 6 | 5 min | Baseline / smoke test |
| 12 VU | 12 | 9 min | Light load |
| 24 VU | 24 | 9 min | Moderate load |
| **48 VU** | **48** | **9 min** | **Load test (expected production)** |
| **96 VU** | **96** | **9 min** | **Stress test** |

---

## Thresholds

| Metric | Threshold |
|---|---|
| `http_req_duration{POST /api/timeline}` | p(95) < 200 ms |
| `http_req_duration{POST /api/upload/file}` | p(95) < 500 ms |
| `http_req_duration{GET /api/timeline/:id}` | p(95) < 200 ms |
| `http_req_duration{PUT /api/timeline/:id}` | p(95) < 200 ms |
| `http_req_duration{DELETE /api/timeline/:id}` | p(95) < 200 ms |
| `http_req_duration{GET /api/jobs/:jobId}` | p(95) < 2000 ms |
| `job_time_to_done_ms` | p(95) < 3000 ms |
| `iteration_success_rate` | rate > 95% |
| `job_timeout_rate` | rate < 5% |
| `upload_failed_rate` | rate < 1% |
| `timeline_save_failed_rate` | rate < 1% |
| `timeline_update_failed_rate` | rate < 1% |
| `delete_failed_rate` | rate < 1% |
| `poll_network_error_rate` | rate < 5% |

---

## Results Summary

### Default — 6 VU (Baseline)

All thresholds passed.

| Metric | Value |
|---|---|
| Iterations completed | 452 |
| Iteration success rate | 100% |
| Job timeout rate | 0% |
| job_time_to_done_ms p(95) | **1.08 s** |
| http_req_duration avg | 20.24 ms |
| POST /api/timeline p(95) | 77.36 ms |
| POST /api/upload/file p(95) | 60.79 ms |
| Avg polls per job | 2 |
| Data received | 414 MB |

At low concurrency the system is well within every threshold. Job processing completes in just over 1 second.

---

### 12 VU — Light Load

All thresholds passed.

| Metric | Value |
|---|---|
| Iterations completed | 1 255 |
| Iteration success rate | 100% |
| Job timeout rate | 0% |
| job_time_to_done_ms p(95) | **2.21 s** |
| http_req_duration avg | 53.38 ms |
| POST /api/timeline p(95) | 177.33 ms |
| POST /api/upload/file p(95) | 168.06 ms |
| Avg polls per job | 2.24 |
| Data received | 1.1 GB |

Doubling VUs from the baseline roughly doubles job processing time. `POST /api/timeline` is already approaching its 200 ms ceiling (177 ms at p95).

---

### 24 VU — Moderate Load

**2 thresholds failed.**

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Iterations completed | 1 271 | — | — |
| Iteration success rate | 100% | >95% | ✓ |
| Job timeout rate | 0% | <5% | ✓ |
| job_time_to_done_ms p(95) | **5.29 s** | <3 000 ms | ✗ |
| POST /api/timeline p(95) | **201.34 ms** | <200 ms | ✗ |
| POST /api/upload/file p(95) | 212.63 ms | <500 ms | ✓ |
| Avg polls per job | 4.07 |

At 24 concurrent users the first degradation becomes measurable. Job completion time almost triples (2.21 s → 5.29 s) reflecting a queuing bottleneck in the background worker.

---

### 48 VU — Load Test (Expected Production)

**2 thresholds failed.**

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Iterations completed | 1 141 | — | — |
| Iteration success rate | 100% | >95% | ✓ |
| Job timeout rate | 0% | <5% | ✓ |
| job_time_to_done_ms p(95) | **12.88 s** | <3 000 ms | ✗ |
| POST /api/timeline p(95) | **207.19 ms** | <200 ms | ✗ |
| POST /api/upload/file p(95) | 221.78 ms | <500 ms | ✓ |
| http_req_duration avg | 61.82 ms | — | — |
| Avg polls per job | 8.73 |
| Data received | 1.0 GB |

Despite zero iteration failures (every upload, save, update, and delete succeeded), the end-to-end **job processing time has grown to a p95 of ~13 seconds** — more than 4× the threshold. The average poll count per job climbed to ~9 polls, confirming that jobs are queuing while the worker catches up. Individual HTTP endpoints remain reasonably fast.

> **This is the target production scenario. The system handles all requests successfully but job processing latency is unacceptable for users.**

---

### 96 VU — Stress Test

**4 thresholds failed.**

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Iterations completed | 2 470 (total attempts) | — | — |
| Iteration success rate | **6.68%** | >95% | ✗ |
| Job timeout rate | **86.49%** | <5% | ✗ |
| job_time_to_done_ms p(95) | **14.81 s** | <3 000 ms | ✗ |
| POST /api/timeline p(95) | **213.48 ms** | <200 ms | ✗ |
| POST /api/upload/file p(95) | 270.91 ms | <500 ms | ✓ |
| Successful iterations | 165 out of 2 470 | — | — |
| poll_timeout_count | **2 305** | — | — |
| Avg polls per job | 13.64 (maxed at 15) |
| Data received | 175 MB |

The backend reaches its limit somewhere between 48 and 96 VUs. Out of 2 470 attempted iterations only 165 (6.7 %) completed. The poll loop hit its maximum iterations on 86.5 % of jobs, meaning the frontend gave up waiting before the worker finished. The job queue is completely saturated.

A notable observation: `data_received` at 96 VU (175 MB) is far lower than at 48 VU (1.0 GB), because most iterations never reached the retrieve-timeline step.

---

## Comparative Overview

| VUs | Iterations | Success Rate | Job p(95) | Job Timeout Rate | POST Timeline p(95) | Avg Polls/Job |
|---|---|---|---|---|---|---|
| 6 (baseline) | 452 | 100% | 1.08 s | 0% | 77 ms | 2 |
| 12 | 1 255 | 100% | 2.21 s | 0% | 177 ms | 2.24 |
| 24 | 1 271 | 100% | 5.29 s | 0% | 201 ms | 4.07 |
| **48 (load)** | **1 141** | **100%** | **12.88 s** | **0%** | **207 ms** | **8.73** |
| **96 (stress)** | **2 470*** | **6.68%** | **14.81 s** | **86.49%** | **213 ms** | **13.64** |

---

## Identified Issues & Required Actions

### 1. Set a Redis TTL on Timeline Job Entries

**Issue:** Job results/status are stored in Redis when the worker finishes processing a transcript but no expiry (TTL) is set. Over time — especially under load — the Redis keyspace fills with stale job entries that are never cleaned up. This is visible in the 96 VU run where `poll_410_count` reached 36 000 and `poll_timeout_count` reached 2 305; the cache is accumulating data from every upload regardless of whether the client ever retrieved the result.

**Action:** Set an appropriate TTL (e.g. 1–24 hours) on every key written to Redis for a job result. This should be applied both when a job is first enqueued and when its result is written by the worker.

```typescript
// Example — when saving job result to Redis
await redis.set(`job:${jobId}`, JSON.stringify(result), 'EX', 3600); // 1-hour TTL
```

---

### 2. Improve the Frontend Polling Mechanism

**Issue:** The frontend polls `GET /api/jobs/:jobId` and fails immediatly. It needs to be investigated to identify if the issue is in the fetching from cache in the backend or polling in the frontend.

**Action:** To be determined

## Conclusions

- The system handles up to **24 concurrent users** comfortably with all thresholds met.
- At **48 VU (expected production load)**, all HTTP operations succeed but job completion time reaches 13s p95.
- At **96 VU**, the system is effectively non-functional for job retrieval. This VU count should be considered beyond the current system capacity.