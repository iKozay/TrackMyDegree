import { DegreeController } from './degreeController';
import { CoursePoolController } from './coursepoolController';
import { CourseController } from './courseController';
import { parseDegree, ParseDegreeResponse } from '../utils/pythonUtilsApi';
import { DEGREES_URL } from '../constants';

/* Seed degree data in the database */
export async function seedDegreeData(degreeName:string): Promise<void>{
    // Validate degree name
    if(!DEGREES_URL[degreeName]){
        console.error("Degree name \"" + degreeName + "\" not found in degreesURL map.");
        return;
    }
    console.log("Seeding data for degree: " + degreeName);
    let data: ParseDegreeResponse = await parseDegree(DEGREES_URL[degreeName]);

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
    const degreeNames = Object.keys(DEGREES_URL);
    for(const degreeName of degreeNames){
        await seedDegreeData(degreeName);
    }
}