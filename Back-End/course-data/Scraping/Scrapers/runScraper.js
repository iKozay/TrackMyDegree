const { spawn } = require('child_process');
const path = require('path');

//This function allows the server to run any scraper (there is only one for now) by giving the path to the script and the arguments
//Arguments would vary by script check each script for a comment there
degreesURL={
  "Computer Engineering":"https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-30-department-of-electrical-and-computer-engineering/section-71-30-2-course-requirements-beng-in-computer-engineering-.html",
  "Mechanical Engineering":"https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-40-department-of-mechanical-industrial-and-aerospace-engineering/section-71-40-1-course-requirements-beng-in-mechanical-engineering-.html",
  "Building Engineering":"https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-50-department-of-building-civil-and-environmental-engineering/section-71-50-1-course-requirements-beng-in-building-engineering-.html",
  "Industrial Engineering":"https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-40-department-of-mechanical-industrial-and-aerospace-engineering/section-71-40-2-course-requirements-beng-in-industrial-engineering-.html",
  "Chemical Engineering":"https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-105-department-of-chemical-and-materials-engineering/section-71-105-1-course-requirements-beng-in-chemical-engineering-.html",
  "Electrical Engineering":"https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-30-department-of-electrical-and-computer-engineering/section-71-30-1-course-requirements-beng-in-electrical-engineering-.html",
  "Aerospace Engineering":"https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-55-aerospace-engineering/course-requirements-beng-in-aerospace-engineering-.html",
  "Civil Engineering":"https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-50-department-of-building-civil-and-environmental-engineering/section-71-50-2-course-requirements-beng-in-civil-engineering-.html",
  "Software Engineering":"https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-70-department-of-computer-science-and-software-engineering/section-71-70-9-degree-requirements-for-the-beng-in-software-engineering.html",

}



function runScraper(degreeName) {
  return new Promise((resolve, reject) => {
    const PYTHON_PATH = '/usr/bin/python3';
    const scriptPath = path.join(__dirname, "degree_data_scraper.py")
    const args = [degreesURL[degreeName]]
    const process = spawn('python', [scriptPath, args]);

    let jsonResult = '';
    let errorOutput = '';

    process.stdout.on('data', (data) => {
      jsonResult += data.toString();
    });

    process.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    process.on('close', (code) => {
            if (code !== 0) {
                console.error(`Python script exited with code ${code}`);
                console.error('Python Error:', errorOutput);
                return reject(new Error(`Scraper failed: ${errorOutput}`));
            }

            try {
                const parsedJson = JSON.parse(jsonResult.trim());
                resolve(parsedJson);
            } catch (e) {
                console.error('JSON Parsing Error:', e);
                console.error('Raw Python Output:', jsonResult);
                reject(new Error(`Failed to parse Python output as JSON: ${e.message}`));
            }
        });

        process.on('error', (err) => {
            console.error('Failed to start Python process:', err);
            reject(err);
        });
  });
}

async function test(){
  const query = "Software Engineering";
  try {
        console.log(`Running scraper with query: ${query}...`);
        const results = await runScraper(query);
        
        console.log('\nScraper Results Received:');
        console.log(results);
        console.log(`\nFound ${results.length} items.`);
        
    } catch (error) {
        console.error('\nOperation Failed:', error.message);
    }
}

test();
