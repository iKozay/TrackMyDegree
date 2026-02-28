// Admin Controller
const DATABASE_CONNECTION_NOT_AVAILABLE = 'Database connection not available';

// Auth Controller
const RESET_EXPIRY_MINUTES = 10;
const DUMMY_HASH = '$2a$10$invalidsaltinvalidsaltinv';

// Base Mongo Controller
const QUERY_FAILED = 'Query failed';
const DELETE_FAILED = 'Delete failed';

// Degree Controller
const DEGREE_WITH_ID_DOES_NOT_EXIST = 'Degree with this id does not exist.';

// lib/cache.ts
const RESULT_TTL_SECONDS = 60 * 60; // 1 hour

// utils/pythonUtilsApi.ts
const PYTHON_SERVICE_BASE_URL = 'http://localhost:15001';

const SEASONS = {
  WINTER: "WINTER",
  SUMMER: "SUMMER",
  FALL: "FALL",
  FALL_WINTER: "FALL/WINTER",
};

export {
  SEASONS,
  DATABASE_CONNECTION_NOT_AVAILABLE,
  RESET_EXPIRY_MINUTES,
  DUMMY_HASH,
  QUERY_FAILED,
  DELETE_FAILED,
  DEGREE_WITH_ID_DOES_NOT_EXIST,
  RESULT_TTL_SECONDS,
  PYTHON_SERVICE_BASE_URL,
};
