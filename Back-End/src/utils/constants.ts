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

// Seeding Controller
// Mapping of degree names to their respective URLs
type DegreeURLMap = {
  [key: string]: string;
};
const DEGREES_URL: DegreeURLMap = {
  'Computer Science':
    'https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-70-department-of-computer-science-and-software-engineering/section-71-70-2-degree-requirements-bcompsc-.html',
  'Computer Engineering':
    'https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-30-department-of-electrical-and-computer-engineering/section-71-30-2-course-requirements-beng-in-computer-engineering-.html',
  'Mechanical Engineering':
    'https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-40-department-of-mechanical-industrial-and-aerospace-engineering/section-71-40-1-course-requirements-beng-in-mechanical-engineering-.html',
  'Building Engineering':
    'https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-50-department-of-building-civil-and-environmental-engineering/section-71-50-1-course-requirements-beng-in-building-engineering-.html',
  'Industrial Engineering':
    'https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-40-department-of-mechanical-industrial-and-aerospace-engineering/section-71-40-2-course-requirements-beng-in-industrial-engineering-.html',
  'Chemical Engineering':
    'https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-105-department-of-chemical-and-materials-engineering/section-71-105-1-course-requirements-beng-in-chemical-engineering-.html',
  'Electrical Engineering':
    'https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-30-department-of-electrical-and-computer-engineering/section-71-30-1-course-requirements-beng-in-electrical-engineering-.html',
  'Aerospace Engineering':
    'https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-55-aerospace-engineering/course-requirements-beng-in-aerospace-engineering-.html',
  'Civil Engineering':
    'https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-50-department-of-building-civil-and-environmental-engineering/section-71-50-2-course-requirements-beng-in-civil-engineering-.html',
  'Software Engineering':
    'https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-70-department-of-computer-science-and-software-engineering/section-71-70-9-degree-requirements-for-the-beng-in-software-engineering.html',
};

// lib/cache.ts
const RESULT_TTL_SECONDS = 60 * 60; // 1 hour

// utils/pythonUtilsApi.ts
const PYTHON_SERVICE_BASE_URL = 'http://localhost:15001';

const SEASONS = {
  WINTER : "WINTER",
  SUMMER : "SUMMER",
  FALL : "FALL",
  FALL_WINTER : "FALL/WINTER",
} ;

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
  DEGREES_URL,
};
