import { DegreeController } from './degreeController';
import { CoursePoolController } from './coursepoolController';
import { CourseController } from './courseController';
import { parseDegree, ParseDegreeResponse } from '../utils/pythonUtilsApi';

type DegreeURLMap = {
    [key: string]: string;
};

const degreesURL: DegreeURLMap = {
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

/* Seed degree data in the database */
export async function seedDegreeData(degreeName:string): Promise<void>{
    // Validate degree name
    if(!degreesURL[degreeName]){
        console.error("Degree name \"" + degreeName + "\" not found in degreesURL map.");
        return;
    }
    console.log("Seeding data for degree: " + degreeName);
    let data: ParseDegreeResponse = await parseDegree(degreesURL[degreeName]);

    console.log("Scraped data for degree: " + degreeName);
    const degreeController = new DegreeController();
    const coursepoolController = new CoursePoolController();
    const courseController = new CourseController();
    console.log("Creating degree: " + data["degree"]._id);
    await degreeController.createDegree(data["degree"]);
    console.log("Degree " + data["degree"]._id + " created.");
    for (const element of data['course_pool']) {
        try {
            const created = await coursepoolController.createCoursePool(element);
            if (created) {
                console.log(`Course pool ${element._id} added.`);
            }
        } catch (err) {
            console.error(`Course pool ${element._id} could not be created.`, element, err);
        }
    }

    for (const element of data['courses']) {
        try {
            await courseController.createCourse(element);
        } catch (err) {
            console.error(`Course ${element._id} could not be created.`, element, err);
        }
    }
    console.log("Seeding completed for degree: " + degreeName);
}

export async function seedAllDegreeData(): Promise<void>{
    const degreeNames = Object.keys(degreesURL);
    for(const degreeName of degreeNames){
        await seedDegreeData(degreeName);
    }
}