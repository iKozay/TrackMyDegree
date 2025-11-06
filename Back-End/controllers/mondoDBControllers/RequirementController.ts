import { runScraper } from "../../course-data/Scraping/Scrapers/runScraper";
import {DegreeController, DegreeData} from "./DegreeController";
import {CoursePoolController, CoursePoolData} from "./CoursepoolController";
import {CourseController, CourseData} from "./CourseController";

/* Seed degree data in the database */
export async function seedDegreeData(degreeName:string): Promise<void>{
    let data: any = await runScraper(degreeName);
    const degreeController = new DegreeController();
    const coursepoolController = new CoursePoolController();
    const courseController = new CourseController();
    await degreeController.createDegree(data["degree"]);
    await data["coursePool"].forEach((element: any) => {
        coursepoolController.createCoursePool(element);
    });
    await data["courses"].forEach((element: any) => {
        courseController.createCourse(element);
    });
}

export interface Requirements {
    "degree":DegreeData;
    "coursePools": CoursePoolData[];
    "courses": CourseData[];
}

export async function getRequirements(degreeID: string): Promise<Requirements> {
    const degreeController = new DegreeController();
    const coursepoolController = new CoursePoolController();
    const courseController = new CourseController();

    let degree = await degreeController.readDegree(degreeID);

    if (!degree) {
        throw new Error(`Degree with ID ${degreeID} not found.`);
    }

    let coursePools: CoursePoolData[] = [];

    if (degree.coursePools) {
        const coursePoolPromises: Promise<CoursePoolData | undefined>[] =
            degree.coursePools.map(poolId =>
                coursepoolController.getCoursePool(poolId)
            );

        const rawCoursePools: (CoursePoolData | undefined)[] = await Promise.all(coursePoolPromises);

        coursePools = rawCoursePools.filter(
            (pool): pool is CoursePoolData => pool !== undefined
        );
    }

    let courses: CourseData[] = [];
    let coursePromises: Promise<CourseData>[] = [];

    coursePools.forEach(pool => {
        if (pool.courses) {
            pool.courses.forEach(courseCode => {
                coursePromises.push(
                    (courseController.getCourseByCode(courseCode) as Promise<CourseData>)
                );
            });
        }
    });

    courses = await Promise.all(coursePromises);

    const output: Requirements = {
        "degree": degree,
        "coursePools": coursePools,
        "courses": courses,
    };
    
    return output;
}
