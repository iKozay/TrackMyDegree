
// Auth Controller
const RESET_EXPIRY_MINUTES = 10;
const DUMMY_HASH = '$2a$10$invalidsaltinvalidsaltinv';

// lib/cache.ts
const RESULT_TTL_SECONDS = 60 * 60; // 1 hour

// utils/pythonUtilsApi.ts
const PYTHON_SERVICE_BASE_URL  = process.env.PYTHON_UTILS_URL || 'http://localhost:15001';

const SEASONS = {
  WINTER: "WINTER",
  SUMMER: "SUMMER",
  FALL: "FALL",
  FALL_WINTER: "FALL/WINTER",
};

export {
  SEASONS,
  RESET_EXPIRY_MINUTES,
  DUMMY_HASH,
  RESULT_TTL_SECONDS,
  PYTHON_SERVICE_BASE_URL,
};
