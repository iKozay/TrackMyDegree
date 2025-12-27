// services/buildTimeline.ts
import { degreeController } from "@controllers/degreeController";
import { parseFile } from "@services/parsingService";
import { ParsedData, ProgramInfo, Semester, CourseStatus } from "../../types/transcript";
import { CoursePoolInfo, DegreeData } from "@controllers/degreeController";
import { CourseData } from "@controllers/courseController";

type TimelineFileData = {
  type: 'file';
  // eslint-disable-next-line no-undef
  data: Buffer;
};

type TimelineObjectData = {
  type: 'form';
  data: ProgramInfo
};

export interface TimelineResult {
    degree?: DegreeData;
    pools?: CoursePoolInfo[];
    semesters: SemesterResult[];
    courses: Record<string, TimelineCourse>;
}


interface TimelineCourse {
  id: string;
  title: string;
  credits: number;
  description?: string;
  offeredIN: string[];
  prerequisites: { anyOf: string[] }[];
  corequisites: { anyOf: string[] }[];
  status: {
    status: CourseStatus;
    semester: string | null;
  };
}

export interface SemesterResult{
  term:string,
  courses:  {
    code: string;
    message?: string;
  }[]
}

export type BuildTimelineParams = TimelineFileData | TimelineObjectData;

export const buildTimeline = async (
  params: BuildTimelineParams,
): Promise<TimelineResult | undefined> => {
    const { type, data } = params;
    let programInfo: ProgramInfo;
    let parsedData: ParsedData|undefined;
    
    if (type === 'file') {
      parsedData = await parseFile(data)
      if (!parsedData?.programInfo) throw new Error("Error parsing document")
      programInfo = parsedData.programInfo
    } else {
      if (!data.degree) throw new Error("Form Data received does not contain a degree")
      programInfo = data;
    }    
  
    if(programInfo.isExtendedCreditProgram){
      //TODO: get ecp degree from db and merge course pools with regular degreee
      //      handle defficiencies
    }

    //get degree from DB that matches provided degree Name
    const result = await getDegreeData(programInfo.degree);
    if (!result) throw new Error( "Error fetching degree data from database")
    
    const { degree, pools: coursePools, courses } = result;
    let semesters_results: SemesterResult[]; 
    const courseStatusMap: Record<string, {
      status: CourseStatus;
      semester: string | null;
    }> = {};
   
    if(parsedData?.semesters)
      semesters_results = processSemestersFromParsedData(parsedData,degree,coursePools,courses, courseStatusMap)
    else
      semesters_results = generateSemesters(programInfo.firstTerm, programInfo.lastTerm)
    
    //add transfer credits to course completed
    if(parsedData?.transferedCourses) addToCourseStatusMap(parsedData?.transferedCourses,courseStatusMap)

    if (parsedData?.exemptedCourses) addToCourseStatusMap(parsedData?.exemptedCourses,courseStatusMap)
    

    //transform courses obtained from db to the format expected by the frontend
    const courseResults: Record<string, TimelineCourse> = Object.fromEntries(
      Object.entries(courses).map(([code, course]) => {
        return [
          code,
          toTimelineCourse(course, courseStatusMap[code]),
        ];
      })
    );

    
    let timelineResult:TimelineResult= {
          degree: degree,    
          pools: coursePools,
          courses: courseResults,
          semesters: semesters_results,
        };

  return timelineResult;
};

function toTimelineCourse(
  course: CourseData,
  override?: { status: CourseStatus; semester: string | null }
): TimelineCourse {
  return {
    id: course._id,
    title: course.title,
    credits: course.credits,
    description: course.description,
    offeredIN: course.offeredIn ?? [],
    prerequisites: mapRequisites(course.rules?.prereq),
    corequisites: mapRequisites(course.rules?.coreq),
    status: {
      status: override?.status ?? "incomplete",
      semester: override?.semester ?? null,
    },
  };
}

// Converts prerequisite/corequisite rules from the DB format
// (string[][] where each inner array represents an OR group)
// into the timeline format: [{ anyOf: string[] }]
function mapRequisites(reqs?: string[][]) {
  return reqs?.map(group => ({
    anyOf: group.map(normalizeCourseCode),
  })) ?? [];
}


function processSemestersFromParsedData(parsedData:ParsedData, degree:DegreeData, coursePools:CoursePoolInfo[], allCourses:Record<string, CourseData>, courseStatusMap: Record<string, {status: CourseStatus;semester: string | null;}> ){
  if(!parsedData.semesters) return []

  let requiredCourses = getRequiredCourses(coursePools)
  let coursesThatNeedCMinus:Set<string>  = getCoursesThatNeedCMinus(degree.name, requiredCourses, allCourses)
  let semesters_results = []; 

  for (const semester of parsedData.semesters){
        let term = semester.term.toUpperCase()
        let coursesInfo = []
        for (const course of semester.courses){
          //get course status
          let normalizedCode = normalizeCourseCode(course.code);
          let courseData = allCourses[normalizedCode];

          if (!courseData) {
            // Course not part of degree → skip or mark as unknown
            coursesInfo.push({
              code: normalizedCode,
              message: "Course not part of degree requirements",
            });
            continue;
          }

          let courseCode = courseData._id;
          let {status, message} = getCourseStatus(term, parsedData?.programInfo?.isCoop, courseCode, coursesThatNeedCMinus, course.grade);

          coursesInfo.push({code:courseCode, message: message});
          const existing = courseStatusMap[courseCode];
          if (!existing || existing.status !== "complete") {//course can be taken two times
            courseStatusMap[courseCode] = {status: status, semester: term}
          } 
          
        }
        semesters_results.push({term: term, courses: coursesInfo}); 
      }
  return semesters_results
}
function getCourseStatus(term:string, isCoop:boolean|undefined, courseCode:string, coursesThatNeedCMinus:Set<string>, courseGrade?:string){
  let status: CourseStatus = "incomplete";
  let message;
  if (isInprogress(term))
      status = "inprogress" 
  else if (isPlanned(term)) 
      status = "planned"
  else if(isCoop && courseCode.toUpperCase().includes("CWTE")){
      if(courseGrade?.toUpperCase() == "PASS") status = "complete"      
  } else{
    let minGrade = 'D-'
    if (coursesThatNeedCMinus.has(courseCode)) minGrade = 'C-'
    let satisfactoryGrade = validateGrade(minGrade, courseGrade)
    //TODO: check if the course is part of the degreee
    if(satisfactoryGrade){
      status = "complete"
    }else{
      status = "incomplete";
      message = `Minimum grade not met: ${minGrade} is needed to pass this course.`;
    }
  }
  return {status, message}
}

function addToCourseStatusMap(courses:string[], courseStatusMap: Record<string, { status: CourseStatus; semester: string | null;}>){
  for (const course of courses){
    courseStatusMap[normalizeCourseCode(course)] = {
        status: "complete",
        semester: null,
    };
  }
}

async function getDegreeData( degree_name :string){
    // We get all degree names from DB
    // We then remove first 2 words (like "BEng in") from them and 
    // check if degree_name (received as function parameter) includes the resulting string
    // example:
    // degree name in DB: BEng in Computer Engineering
    // degree_name: Bachelor of Engineering Computer Engineering
    // We remove "BEng in" and check if the degree_name "contains Computer Engineering"
    let degrees = await degreeController.readAllDegrees()
    let degree_id = degrees.find((d)=>degree_name.toLowerCase().includes(d.name.split(' ').slice(2).join(' ').toLowerCase()))?._id
    if(!degree_id) return undefined
    //const degree:DegreeData = await degreeController.readDegree(degree_id);
    //const coursePool: CoursePoolInfo = await degreeController.getCoursePoolsForDegree(degree_id)
    return await degreeController.readDegreeData(degree_id)
}
function isInprogress(currentTerm:string){
  const today = new Date();
  const { start, end } = getTermRanges(currentTerm);

  return today >= start && today <= end;
} 

function isPlanned(currentTerm:string){
  const today = new Date();
  const { start, end } = getTermRanges(currentTerm);

  return today <= start; //if the term didnt start yet, courses included in it are planned
} 

function validateRequisites (course:{ code: string; grade?: string },allCourses:Record<string, CourseData>, parsedSemesters :Semester[], currentTerm:string){
  //TODO
  return true
}
function getRequiredCourses(coursePools: CoursePoolInfo[]){
  const requiredCourses:Set<string> = new Set<string>();
  for(const pool of coursePools){ 
    if (!pool.name.toLowerCase().includes('elective')){ //core courses
      for(const courseCode of pool.courses){
        requiredCourses.add(courseCode);
      }
    }
  }
  return requiredCourses;
}

function getCoursesThatNeedCMinus(degreeName:string, requiredCourses:Set<string>, allCourses:Record<string, CourseData>){
  //if degree is in gina cody and the course is a 200 level course  
  const coursesThatNeedCMinus:Set<string> = new Set<string>();
  const name = degreeName.toLowerCase();
  if (!name.includes('engr') && !name.includes('comp')) return coursesThatNeedCMinus;
  
  const is200LevelCourse = (code: string) => {
    const match = /\b(\d{3})\b/.exec(code);
    return match?.[1].startsWith("2") ?? false;
  };

  for(const requiredCourse of requiredCourses){
    const prereqList = allCourses[requiredCourse]?.rules?.prereq;
    if(!prereqList) continue;
    for (const prereqs of prereqList){//if course is a prereq for core courses
      for(const prereq of prereqs){ 
        if(!requiredCourses.has(prereq) && is200LevelCourse(prereq)) continue; //only required 200-level courses need C- 
        
        coursesThatNeedCMinus.add(prereq)}
    }
  }

  return coursesThatNeedCMinus;
}


// Normalizes a course code by removing all whitespace, 
// inserting a space between the letter prefix and numeric part, and converting it to uppercase.
// Example: " engr   201 " → "ENGR 201" or "ENGR201" -> "ENGR 201"
function normalizeCourseCode(code: string): string {
  return code
    .replace(/\s+/g, '') //Removes all whitespace
    .replace(/([a-zA-Z]+)(\d+)/, '$1 $2') //Inserts a space between letters and numbers
    .toUpperCase();
}


function validateGrade( minGrade:string, courseGrade?: string  ): boolean {
  //validates that a course received sufficent grade (for 200 core classes in gina cody at least C- is required)
  
  if (!courseGrade) return true //if no grade is provided assume that either course is in progress or course is passed

  if (courseGrade.toUpperCase() == 'DISC') return false
  
  if (courseGrade.toUpperCase() == 'EX') return true

  const gradeValues: Record<string, number> = {
  "A+": 12, "A": 11, "A-": 10, "B+": 9, "B": 8, "B-": 7, "C+": 6, "C": 5, "C-": 4, "D+": 3, "D": 2, "D-": 1, "F": 0
  };
 
  const studentValue = gradeValues[courseGrade.toUpperCase()] ?? 0;
  const minValue = gradeValues[minGrade.toUpperCase()] ?? 0;

  return studentValue >= minValue;
}


function generateSemesters( startTerm?: string, endTerm?:string ){
  const results: SemesterResult[] = [];
    let terms = generateTerms(startTerm,endTerm)
    for (const term of terms) {
      results.push({term:term,courses:[]});
    } 
  return results;
}

function generateTerms(startTerm?: string, endTerm?:string){
  if (!startTerm) {
    // This shouldn't trigger but if does we use a default starting term
    const currentYear = new Date().getFullYear();
    startTerm = `FALL ${currentYear - 4}`;
  }
  const terms = ['WINTER', 'SUMMER', 'FALL'];
  const startYear = Number.parseInt(startTerm.split(' ')[1]); // Extracting the year
  const startSeason = startTerm.split(' ')[0]; // Extracting the season
  let endYear, endSeason;
  if (!endTerm) {
    endYear = startYear + 3;
    endSeason = startSeason;
  } else {
    endYear = Number.parseInt(endTerm.split(' ')[1]); // Extracting the year
    endSeason = endTerm.split(' ')[0]; // Extracting the season
  }

  const resultTerms = [];

  let currentYear = startYear;
  let currentSeasonIndex = terms.indexOf(startSeason); // Find index of start season in the list

  // Loop to generate all terms from start to end
  while (currentYear < endYear || (currentYear === endYear && currentSeasonIndex <= terms.indexOf(endSeason))) {
    const term = `${terms[currentSeasonIndex]} ${currentYear}`;
    resultTerms.push(term);

    // Move to the next season
    currentSeasonIndex++;

    if (currentSeasonIndex === terms.length) {
      currentSeasonIndex = 0;
      currentYear++;
    }
  }
  // console.log("terms:", resultTerms)
  return resultTerms;
};

function getTermRanges(term: string): { start: Date; end: Date } {
  // Example: "FALL 2026" or "FALL/WINTER 2025-26"
  //TODO: change dates to reflect actual calendar
  let [name, yearStr] = term.split(" ");
  if(name == "FALL/WINTER"){
    yearStr = yearStr.split('-')[0]
  }
  const year = Number(yearStr);

  let start: Date;
  let end: Date;

  switch (name) {
    case "WINTER":
      start = new Date(year, 0, 1);       // Jan 1
      end   = new Date(year, 3, 30);      // Apr 30
      break;

    case "SUMMER":
      start = new Date(year, 4, 1);       // May 1
      end   = new Date(year, 7, 31);      // Aug 31
      break;

    case "FALL":
      start = new Date(year, 8, 1);       // Sep 1
      end   = new Date(year, 11, 31);     // Dec 31
      break;
    case "FALL/WINTER":
      start = new Date(year, 8, 1);       // Sep 1
      end   = new Date(year+1, 3, 30);  // Apr 30
      break;     
    default:
      throw new Error("Unknown term: " + name);
  }

  return { start, end };
}


