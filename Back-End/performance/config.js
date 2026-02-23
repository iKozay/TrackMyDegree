/// <reference path="./k6-globals.d.js" />

export const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";
export const PDF_PATH = __ENV.PDF_PATH || "./test-pdfs/transcripts/Student Record.pdf";
export const TIMELINE_NAME_PREFIX = __ENV.TIMELINE_NAME_PREFIX || "k6-poc";

export const POLL_MAX_SECONDS = Number(__ENV.POLL_MAX_SECONDS || "60");
export const POLL_INTERVAL_SECONDS = Number(__ENV.POLL_INTERVAL_SECONDS || "1");
export const POLL_REQUEST_TIMEOUT = __ENV.POLL_REQUEST_TIMEOUT || "5s";

export const DEBUG = __ENV.DEBUG === "1";

export function debugLog(msg) {
    if (DEBUG) console.log(msg);
}

// Loaded at init time (outside default fn) — required by k6
export const PDF_BYTES = open(PDF_PATH, "b");
