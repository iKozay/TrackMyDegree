import regex from './regexUtils';

const degreeMap = {
  'Bachelor of Engineering, Aerospace Engineering': 'AERO',
  'Bachelor of Engineering, Aerospace Engineering Option: Aerodynamics and Propulsion': 'AEROA',
  'Bachelor of Engineering, Aerospace Engineering Option B: Aerospace Structures and Materials': 'AEROB',
  'Bachelor of Engineering, Aerospace Engineering Option: Avionics and Aerospace Systems': 'AEROC',
  'Bachelor of Engineering, Building Engineering': 'BCEE',
  'Bachelor of Engineering, Building Engineering Option: Building Energy and Environment': 'BCEEA',
  'Bachelor of Engineering, Building Engineering Option: Building Structures and Construction': 'BCEEB',
  'Bachelor of Engineering, Civil Engineering': 'CIVI',
  'Bachelor of Engineering, Civil Engineering Option: Civil Infrastructure': 'CIVIA',
  'Bachelor of Engineering, Civil Engineering Option: Environmental': 'CIVIB',
  'Bachelor of Engineering, Civil Engineering Option: Construction Engineering and Management': 'CIVIC',
  'Bachelor of Engineering, Computer Engineering': 'COEN',
  'Bachelor of Computer Science, Computer Science': 'CompSci',
  'Bachelor of Engineering, Electrical Engineering': 'ELEC',
  'Bachelor of Engineering, Industrial Engineering': 'INDU',
  'Bachelor of Engineering, Mechanical Engineering': 'MECH',
  'Bachelor of Engineering, Software Engineering': 'SOEN',
};

/**
 ** Cleans the transcript text by removing irrelevant parts
 * @param {string} text
 * @returns
 */
function cleanText(text) {
  console.log('RAW PAGES: ', text);
  // text = text.replace(/^[\s\S]*?(?=Beginning of Undergraduate Record)/, '');
  // text = text.replace(/SPECIAL NOTE:.*?(?=Term GPA)/gis, ''); //? Remove all SPECIAL NOTE sections
  // text = text.replace(/Student Record Web Page.*?(?=\d{1}\/\d{1})/gis, ''); //? Remove all URLs
  // text = text.replace(
  //   /Term GPA[\s\S]*?(?=\s*(?:Winter|Fall\/Winter|Summer|Fall)\s+\d{4}(?:-\d{2})?\s+Bachelor)/gi,
  //   '',
  // );

  //? Remove everything before the first term
  text = text.replace(/^[\s\S]*?(?=(Winter|Fall|Summer) \d{4}\s+Bachelor)/i, '');

  //? Remove all SPECIAL NOTE sections (they appear before Term GPA)
  text = text.replace(/SPECIAL NOTE:[\s\S]*?(?=Term GPA)/gi, '');

  //? Remove Term GPA lines (standalone)
  text = text.replace(/Term GPA\s+\d+\.\d+\s+/g, '');

  //? Remove assessment information (keep the term line before it)
  text = text.replace(
    /(\d{2}\/\d{2}\/\d{4}: ASSESSED: [A-Z ]+)|(ASSESSMENT GPA: \d+\.\d+ - ASSESSMENT PERIOD: [A-Za-z0-9 -]+)/g,
    '',
  );

  //? Remove URLs and timestamps
  text = text.replace(/\d{1,2}\/\d{1,2}\/\d{2,4}, \d{1,2}:\d{2} [AP]M/g, '');
  text = text.replace(/Student Record Web Page[\s\S]*?(?=COURSE|(Winter|Fall|Summer) \d{4})/gi, '');

  console.log('PAGES: ', text);
  let pages = text.split('[PAGE]');

  // for (let i = 0; i < pages.length; i++) {
  //   console.log(`Page ${i}: ` + pages[i]);
  // }

  return pages;
}

/**
 ** Extracts only the degree information (Degree Name) from the provided text and maps it to a Degree ID
 * @param {string} text
 * @returns
 */
function extractDegreeInfo(text) {
  text = text.replace(/\s+/g, ' ').trim(); //? Normalize whitespace and line breaks

  const match = regex.matchDegree(text);

  if (!match) return null;

  const degreeName = match[0].trim();
  const baseDegree = match[1].trim();
  const option = match[2] ? match[2].trim() : null;
  const isCoop = /CO-?OP/i.test(text);
  const isEcp = /Extended\s*Credit\s*Program/i.test(text);

  let degreeId = degreeMap[degreeName] || 'UNKN';

  if (option) {
    // Add option indicator (first letter of each word)
    degreeId += option
      .split(/\s+/)
      .map((w) => w[0])
      .join('');
  }

  // if (isCoop) degreeId += 'C';
  // if (isEcp) degreeId += 'E';

  return {
    name: `${degreeName}${option ? ` (${option})` : ''}${isCoop ? ' - Coop' : ''}`,
    id: degreeId,
  };
}

/**
 ** Extracts only the acadamic terms from the provided transcript text
 * @param {string} text
 * @returns
 */
function extractAcademicTerms(text) {
  const termPattern =
    /(Fall|Winter|Summer|Fall\/Winter)\s*(?:20)?(\d{2})(?:\s*-\s*(\d{2}))?\s*(?=COURSE|Bachelor\s*)/gi;
  const terms = [];
  let matchTerm;

  while ((matchTerm = termPattern.exec(text)) !== null) {
    console.log('MATCH TERM: ', matchTerm); //! DEBUG**************************************
    const [fullMatch, season, year1, year2] = matchTerm;
    const year = year2 ? `20${year1}-${year2}` : `20${year1}`;
    terms.push({
      name: `${season} ${year}`,
      type: 'Term',
      position: matchTerm.index,
    });
  }

  return terms;
}

/**
 ** Extracts only the separators (headers) of acadamic terms from the provided transcript text
 * @param {string} text
 * @returns
 */
function extractTermSeparators(text) {
  const separatorPattern = /COURSE\s*DESCRIPTION\s*ATTEMPTED\s*GRADE\s*NOTATION/g;
  const separators = [];
  let matchSeparator;
  let test_text = text.split(`/${6}`);

  while ((matchSeparator = separatorPattern.exec(text)) !== null) {
    separators.push({
      position: matchSeparator.index,
    });

    test_text[matchSeparator.index - 1] = `\n${separators.length - 1}`;
  }
  console.log('SEPARATOR: ', separators);
  console.log('TEST TEXT: ', test_text.join(''));

  return separators;
}

/**
 ** Ectract all courses from the transcript text
 * @param {string} text
 * @returns
 */
function extractAllCourses(text) {
  // Pattern matches: DEPT CODE GRADE CREDITS (with flexible spacing)
  const coursePattern =
  /([A-Z]{3,4})\s+(\d{3})\s+([A-Z0-9]+(?:-\s*\d+)?)\s+([A-Z][A-Za-z\s\-.()/,&+':]+?)\s+(\d\.\d{2})\s+([A-D][+-]\s*|PASS|EX|FNS|DISC|NR)?(?:\s+([\d.]+))?(?:\s+[\d.]+\s+\d+\s+[\d.]+)?/g;
  // /([A-Za-z]{3,4})\s+(\d{3})\s+([A-Za-z\d{1,2}]{1,3})\s+([A-Za-z\s+\-./(),&]+)\s+([\d.]+)\s+([A-D][\s|+|-]+|PASS|EX|\s)\s+([\d.]+)\b/g;
  const exemptPattern = /([A-Za-z]{3,4})\s+(\d{3})\s+(.+?)\s+(EX|TRC)\b/g;
  const courses = [];
  let match;

  // Regular courses
  while ((match = coursePattern.exec(text)) !== null) {
    console.log("COURSES MATCH: ", match);
    courses.push({
      code: `${match[1]}${match[2]}`,
      grade: match[5],
      position: match.index,
      type: 'Course',
      status: match[6]
    });
  }

  // Exempted courses
  while ((match = exemptPattern.exec(text)) !== null) {
    console.log("EXEMPTION MATCH: ", match);
    courses.push({
      code: `${match[1]}${match[2]}`,
      grade: match[3],
      position: match.index,
      type: 'Exempted',
      status: match[6]
    });
  }

  console.log('COURSES INFO: ', courses.sort((a, b) => a.position - b.position)); //! DEBUG**************************************
  const passedCourses = courses.filter((course) => course.status !== "FNS" && course.status !== "DISC" && course.status !== "NR");


  return passedCourses.sort((a, b) => a.position - b.position);
}

/**
 ** Match the extracted courses to the corresponding terms
 * @param {{ name: string; type: string; position: number; }[]} terms
 * @param {{ code: string; grade: string; position: number; type: string; }[]} courses
 * @param {{ position: number; }[]} separators
 * @returns
 */
function matchCoursesToTerms(terms, courses, separators) {
  const results = [];
  let currentTermIndex = 0;
  let currentTerm = terms[currentTermIndex]?.name || 'Unknown Term';

  // Group exempted courses separately
  const exemptedCourses = courses.filter((c) => c.type === 'Exempted');
  if (exemptedCourses.length > 0) {
    results.push({
      term: 'Exempted Courses',
      courses: exemptedCourses.map((c) => ({
        course: c.code,
        grade: c.grade,
      })),
    });
  }

  // Match regular courses to terms
  const regularCourses = courses.filter((c) => c.type === 'Course');
  const termBoundaries = separators; //terms.map((t) => t.position);

  for (const course of regularCourses) {
    // Advance to the current term if course is after next term boundary
    while (
      currentTermIndex < termBoundaries.length - 1 &&
      course.position > termBoundaries[currentTermIndex + 1].position
    ) {
      currentTermIndex++;
      currentTerm = terms[currentTermIndex]?.name;
    }

    results.push({
      term: currentTerm,
      course: course.code,
      grade: course.grade,
    });
  }

  return results;
}

export {
  cleanText,
  extractDegreeInfo,
  extractAcademicTerms,
  extractTermSeparators,
  extractAllCourses,
  matchCoursesToTerms,
};
