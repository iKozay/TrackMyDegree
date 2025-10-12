const path = require("path");
const fs = require("fs");
const { runScraper } = require("../course-data/Scraping/Scrapers/runScraper.js");

describe("runScraper test", () => {
  const outputFile1 = path.resolve(__dirname, "phyl.json");
  const outputFile2 = path.resolve(__dirname, "course_pool.json");
  const outputFile3 = path.resolve(__dirname, "degree.json");
  afterAll(()=>{
    // Cleanup
    if (fs.existsSync(outputFile1)) {
      fs.unlinkSync(outputFile1);
      console.log("Cleaned up test file:", outputFile1);
    }
    if (fs.existsSync(outputFile2)) {
      fs.unlinkSync(outputFile2);
      console.log("Cleaned up test file:", outputFile1);
    }
    if (fs.existsSync(outputFile3)) {
      fs.unlinkSync(outputFile3);
      console.log("Cleaned up test file:", outputFile1);
    }
  });


  test("runs the Python course scraper script successfully", async () => {
    // Get the absolute path to course scraper
    const scriptPath = path.resolve(__dirname, "../course-data/Scraping/Scrapers/course_data_scraper.py");

    // Run the scraper
    const result = await runScraper(scriptPath, ["https://concordia.ca/academics/undergraduate/calendar/current/section-31-faculty-of-arts-and-science/section-31-220-department-of-philosophy/philosophy-courses.html", "phyl.json"]);

    
    expect(result).toBe("Scraped data has been saved to phyl.json");
  });

  test("runs the Python requirement scraper script successfully", async ()=>{
    // Get the absolute path to the requirement scraper
    const scriptPath = path.resolve(__dirname, "../course-data/Scraping/Scrapers/degree_data_scraper.py");

    // Run the scraper
    const result = await runScraper(scriptPath, ["https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-70-department-of-computer-science-and-software-engineering/section-71-70-9-degree-requirements-for-the-beng-in-software-engineering.html#12130", "."]);

    expect(result).toBe("Scraped data has been saved to .")
  });
});
