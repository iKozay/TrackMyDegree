const path = require("path");
const { runScraper } = require("../course-data/Scraping/Scrapers/runScraper.js");

describe("runScraper test", () => {
  test("runs the Python script successfully", async () => {
    // Get the absolute path to your Python script
    const scriptPath = path.resolve(__dirname, "../course-data/Scraping/Scrapers/course_data_scraper.py");

    // Run the scraper
    const result = await runScraper(scriptPath, ["https://concordia.ca/academics/undergraduate/calendar/current/section-31-faculty-of-arts-and-science/section-31-220-department-of-philosophy/philosophy-courses.html", "phyl.json"]);

    
    expect(result).toBe("Scraped data has been saved to phyl.json");
  });
});
