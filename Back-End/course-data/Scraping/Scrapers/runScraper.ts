import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as path from 'path';


type DegreeURLMap = {
    [key: string]: string;
};


export const degreesURL: DegreeURLMap = {
    "Computer Engineering": "https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-30-department-of-electrical-and-computer-engineering/section-71-30-2-course-requirements-beng-in-computer-engineering-.html",
    "Mechanical Engineering": "https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-40-department-of-mechanical-industrial-and-aerospace-engineering/section-71-40-1-course-requirements-beng-in-mechanical-engineering-.html",
    "Building Engineering": "https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-50-department-of-building-civil-and-environmental-engineering/section-71-50-1-course-requirements-beng-in-building-engineering-.html",
    "Industrial Engineering": "https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-40-department-of-mechanical-industrial-and-aerospace-engineering/section-71-40-2-course-requirements-beng-in-industrial-engineering-.html",
    "Chemical Engineering": "https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-105-department-of-chemical-and-materials-engineering/section-71-105-1-course-requirements-beng-in-chemical-engineering-.html",
    "Electrical Engineering": "https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-30-department-of-electrical-and-computer-engineering/section-71-30-1-course-requirements-beng-in-electrical-engineering-.html",
    "Aerospace Engineering": "https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-55-aerospace-engineering/course-requirements-beng-in-aerospace-engineering-.html",
    "Civil Engineering": "https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-50-department-of-building-civil-and-environmental-engineering/section-71-50-2-course-requirements-beng-in-civil-engineering-.html",
    "Software Engineering": "https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-70-department-of-computer-science-and-software-engineering/section-71-70-9-degree-requirements-for-the-beng-in-software-engineering.html",
};

/**
 * Executes a Python scraper script and returns its JSON output.
 * @param degreeName - The name of the degree whose URL will be passed as an argument.
 * @returns A promise that resolves to the parsed JSON object (courses, etc.).
 */
export function runScraper(degreeName: string): Promise<any> {
    return new Promise((resolve, reject) => {
        // Check if the degree name is valid
        if (!degreesURL[degreeName]) {
            return reject(new Error(`Degree name "${degreeName}" not found in degreesURL map.`));
        }

        const scriptPath: string = path.join(__dirname, "degree_data_scraper.py");
        
        const args: string[] = [degreesURL[degreeName]]; 
        
        const process: ChildProcessWithoutNullStreams = spawn('python', [scriptPath, ...args]);

        let jsonResult: string = '';
        let errorOutput: string = '';

        process.stdout.on('data', (data: Buffer) => {
            jsonResult += data.toString();
        });

        process.stderr.on('data', (data: Buffer) => {
            errorOutput += data.toString();
        });

        process.on('close', (code: number) => {
            if (code !== 0) {
                console.error(`Python script exited with code ${code}`);
                console.error('Python Error:', errorOutput);
                return reject(new Error(`Scraper failed: ${errorOutput}`));
            }

            try {
                const parsedJson: any = JSON.parse(jsonResult.trim());
                resolve(parsedJson);
            } catch (e: any) {
                console.error('JSON Parsing Error:', e);
                console.error('Raw Python Output:', jsonResult);
                reject(new Error(`Failed to parse Python output as JSON: ${e.message}`));
            }
        });

        process.on('error', (err: Error) => {
            console.error('Failed to start Python process:', err);
            reject(err);
        });
    });
}

async function test(): Promise<void> {
    const query: string = "Software Engineering";
    try {
        console.log(`Running scraper with query: ${query}...`);
        const results: any = await runScraper(query); 
        
        console.log('\nScraper Results Received:');
        console.log(results);
        if (Array.isArray(results)) {
             console.log(`\nFound ${results.length} items.`);
        }
       
    } catch (error: any) {
        console.error('\nOperation Failed:', error.message);
    }
}

// test();