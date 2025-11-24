const { mkdir, writeFile, rm } = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { degreesURL, runScraper } = require('../../../../course-data/Scraping/Scrapers/runScraper');
/*
 * Utility to scrape degree data and write to temp json files for integration tests to use.
 * Also provides cleanup function to remove temp files after tests complete.
 */

// Default to system temp directory for cross-platform compatibility
const DEFAULT_TEMP_DIR = path.join(os.tmpdir(), 'scraper-test-data');

// scrape all degrees and write each JSON to a temp file
async function getScraperData() {
  const degreeNames = Object.keys(degreesURL);
  const written = [];

  try {
    await mkdir(DEFAULT_TEMP_DIR, { recursive: true });
  } catch (e) {
    console.error(`Failed to create temp dir ${DEFAULT_TEMP_DIR}: ${e.message}`);
    throw e;
  }

  await Promise.all(
    // save each degree's scraped data to a separate file
    degreeNames.map(async (degreeName) => {
      try {
        const data = await runScraper(degreeName);
        const safeName = degreeName.replaceAll(/\s+/g, '_');
        const file = path.join(DEFAULT_TEMP_DIR, `temp_scraper_output_${safeName}.json`);
        await writeFile(file, JSON.stringify(data, null, 2));
        written.push(file);
      } catch (e) {
        console.error(`Error getting scrapper data for "${degreeName}": ${e.message}`);
      }
    })
  );

  if (written.length > 0) {
    console.log(`Written ${written.length}/${degreeNames.length} files`);
  }

  return written;
}

// remove generated temp directory
async function cleanupScraperFiles() {
  try {
    await rm(DEFAULT_TEMP_DIR, { recursive: true, force: true });
  } catch (e) {
    console.error(`Unexpected removal error for ${DEFAULT_TEMP_DIR}: ${e.message}`);
  }
}

module.exports = { getScraperData, cleanupScraperFiles, DEFAULT_TEMP_DIR };