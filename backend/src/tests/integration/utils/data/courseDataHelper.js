const fs = require('node:fs');
const path = require('node:path');

// Global cache for loaded JSON files to avoid multiple reads
const catalogDataCache = new Map();

// Define catalog prefixes to look for
const CATALOGS = ['AERO', 'BCEE', 'BLDG', 'CIVI', 'COEN', 'COMP', 'ELEC', 'ENCS', 'ENGR', 'IADI', 'INDU', 'MECH', 'MIAE', 'SOEN'];

/**
 * Load catalog data from JSON file with caching
 * @param {string} catalog - The catalog prefix (e.g., 'COMP', 'COEN')
 * @returns {Array|null} - Array of course data or null if not found
 */
function loadCatalogData(catalog) {
  if (catalogDataCache.has(catalog)) {
    return catalogDataCache.get(catalog);
  }
  
  try {
    const filePath = path.join(__dirname, '../../../__fixtures__/data/course-data', `${catalog}.json`);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      catalogDataCache.set(catalog, data);
      return data;
    }
  } catch (error) {
    console.warn(`Failed to load catalog data for ${catalog}:`, error.message);
  }
  
  catalogDataCache.set(catalog, null);
  return null;
}

/**
 * Find expected course data by course ID
 * @param {string} courseId - The course ID (e.g., 'COMP 248')
 * @returns {Object|null} - Course data object or null if not found
 */
function findExpectedCourseData(courseId) {
  // Check if course matches any catalog prefix
  const matchedCatalog = CATALOGS.find(catalog => 
    courseId.startsWith(catalog + ' ')
  );
  
  if (!matchedCatalog) {
    return null;
  }
  
  // Load catalog data
  const catalogData = loadCatalogData(matchedCatalog);
  if (!catalogData) {
    return null;
  }
  
  // Find matching course in catalog data
  const expectedCourse = catalogData.find(course => course._id === courseId);
  return expectedCourse || null;
}

module.exports = {
  loadCatalogData,
  findExpectedCourseData
};
