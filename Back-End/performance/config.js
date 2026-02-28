/// <reference path="./k6-globals.d.js" />

export const BASE_URL = __ENV.BASE_URL || "http://localhost:8000"; // backend URL
export const TIMELINE_NAME_PREFIX = __ENV.TIMELINE_NAME_PREFIX || "k6-poc";

export const POLL_MAX_SECONDS = Number(__ENV.POLL_MAX_SECONDS || "15"); // how long to keep polling for a job before giving up
export const POLL_INTERVAL_SECONDS = Number(__ENV.POLL_INTERVAL_SECONDS || "1"); // how long to wait between poll attempts (if job not done yet)
export const POLL_REQUEST_TIMEOUT = __ENV.POLL_REQUEST_TIMEOUT || "5s"; // how long to wait for each individual poll request before treating as network error

export const DEBUG = __ENV.DEBUG === "1";
export function debugLog(msg) { if (DEBUG) console.log(msg); }

// All PDFs loaded at init time — k6 requires open() at module scope
export const PDF_FILES = {
    transcript: [
        { bytes: open("./test-pdfs/transcripts/transcript-coop.pdf",    "b"), filename: "transcript-coop.pdf"    },
        { bytes: open("./test-pdfs/transcripts/transcript-ecp.pdf",     "b"), filename: "transcript-ecp.pdf"     },
        { bytes: open("./test-pdfs/transcripts/transcript-regular.pdf", "b"), filename: "transcript-regular.pdf" },
    ],
    acceptance_letter: [
        { bytes: open("./test-pdfs/acceptance-letters/acceptance-letter-coop.pdf",    "b"), filename: "acceptance-letter-coop.pdf"    },
        { bytes: open("./test-pdfs/acceptance-letters/acceptance-letter-ecp.pdf",     "b"), filename: "acceptance-letter-ecp.pdf"     },
        { bytes: open("./test-pdfs/acceptance-letters/acceptance-letter-regular.pdf", "b"), filename: "acceptance-letter-regular.pdf" },
    ],
};


const DOC_TYPES      = Object.keys(PDF_FILES);          // ["transcript", "acceptance_letter"]
const FILES_PER_TYPE = PDF_FILES.transcript.length;     // 3
const TOTAL          = DOC_TYPES.length * FILES_PER_TYPE; // 6

/**
 * Returns the PDF to use for a given VU.
 *
 * Override behaviour via env vars (both must be set to pin a specific file):
 *   DOC_TYPE=transcript        (or acceptance_letter)
 *   FILE_NAME=transcript-coop  (filename prefix, with or without .pdf extension)
 *
 * If not overridden, falls back to deterministic VU rotation across all 6 files.
 *
 * @param {number} vu - k6 __VU (1-based)
 * @returns {{ docType: string, file: { bytes: ArrayBuffer, filename: string } }}
 */
export function getPdfForVU(vu) {
    const envDocType  = __ENV.DOC_TYPE;
    const envFileName = __ENV.FILE_NAME;

    if (envDocType && envFileName) {
        const files = PDF_FILES[envDocType];
        if (!files) throw new Error(`DOC_TYPE="${envDocType}" is not valid. Use: ${DOC_TYPES.join(", ")}`);

        const file = files.find(f => f.filename.startsWith(envFileName));
        if (!file) throw new Error(`FILE_NAME="${envFileName}" not found for DOC_TYPE="${envDocType}". Available: ${files.map(f => f.filename).join(", ")}`);

        return { docType: envDocType, file };
    }

    // __VU is 0 during init stage — fall back to index 0
    const safeVu  = Math.max(1, vu);
    const idx     = (safeVu - 1) % TOTAL;
    const typeIdx = Math.floor(idx / FILES_PER_TYPE);
    const fileIdx = idx % FILES_PER_TYPE;
    const docType = DOC_TYPES[typeIdx];
    return { docType, file: PDF_FILES[docType][fileIdx] };
}
