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
  // console.log('RAW PAGES: ', text);
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

  // console.log('PAGES: ', text);
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
 ** Extracts only the academic terms from the provided transcript text
 * Used to find all term matches using the term regex pattern defined in regexUtils.js
 * Terms are returned in the order they were found in the transcript
 * @param {string} text
 * @returns
 */
function extractAcademicTerms(text) {
  const terms = [];
  let matchTerm;

  while ((matchTerm = regex.termPattern.exec(text)) !== null) {
    // console.log('MATCH TERM: ', matchTerm); //! DEBUG**************************************
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
 ** Extracts only the separators of academic terms from the provided transcript text
 * Used to find all term separator matches using the separator regex pattern defined in regexUtils.js
 * Separators are returned in the order they were found in the transcript
 * @param {string} text
 * @returns
 */
function extractTermSeparators(text) {
  const separators = [];
  let matchSeparator;
  let test_text = text.split(`/${6}`); // used in debugging only

  while ((matchSeparator = regex.separatorPattern.exec(text)) !== null) {
    separators.push({
      position: matchSeparator.index,
    });

    test_text[matchSeparator.index - 1] = `\n${separators.length - 1}`;
  }
  // console.log('SEPARATOR: ', separators);
  // console.log('TEST TEXT: ', test_text.join(''));

  return separators;
}

/**
 ** Extract all courses from the transcript text
 * Used to find all course matches using the course regex pattern defined in regexUtils.js
 * Regular courses and exempted courses are handled separately - they are distinguished by the type field ; Course or Exempted
 * Only passed and exempted courses are returned (FNS, DISC, NR are filtered out)
 * Courses are returned in the order they were found in the transcript
 * @param {string} text
 * @returns
 */
function extractAllCourses(text) {
  const courses = [];
  let match;

  // Find all course matches for regular courses
  while ((match = regex.coursePattern.exec(text)) !== null) {
    // console.log("COURSES MATCH: ", match);
    courses.push({
      code: `${match[1]}${match[2]}`,
      grade: match[5],
      position: match.index,
      type: 'Course',
      status: match[6],
    });
  }

  // Find all course matches for exempted courses
  while ((match = regex.exemptPattern.exec(text)) !== null) {
    // console.log("EXEMPTION MATCH: ", match);
    courses.push({
      code: `${match[1]}${match[2]}`,
      grade: match[3], // this actually holds the course description EX or TRC not the grade - misleading naming
      position: match.index,
      type: 'Exempted',
      term: 'exempted 2020', // all exempted courses are grouped under this term by default
      status: match[6],
    });
  }

  // console.log('COURSES INFO: ', courses.sort((a, b) => a.position - b.position)); //! DEBUG**************************************
  const passedCourses = courses.filter(
    (course) => course.status !== 'FNS' && course.status !== 'DISC' && course.status !== 'NR',
  ); // Save only passed and exempted courses (filter out FNS, DISC, NR)

  return passedCourses.sort((a, b) => a.position - b.position); // returns courses in the order they were found in the transcript
}

/**
 ** Functions to extract terms, courses, and separators from transcript. Used in src/pages/UploadTranscriptPage
 * @param {*} pagesData
 * @returns an object containing terms, courses, separators, degree name, degree ID, and extended credit program (ecp) status
 */
function extractTranscriptComponents(pagesData) {
  let fullText = pagesData.map((p) => `[PAGE] ${p.text}`).join('\n');
  let pages = cleanText(fullText); // create an array of pages with only relevant text
  let numPages = pages.length;
  let transcript = false;
  let ecp = null;

  fullText = pages.join(''); // combine cleaned pages back into a single text block
  const debug_text = pages.join('\n');
  // console.log(debug_text);

  const degreeInfo = extractDegreeInfo(pages[numPages - 2] + pages[numPages - 1]);
  const { name, id } = degreeInfo; // destructure degree name and id from the extracted degree info
  const terms = extractAcademicTerms(fullText); // extract all terms from transcript text
  const separators = extractTermSeparators(fullText); // find all positions of term separators
  const courses = extractAllCourses(fullText); // extract all courses (regular and exempted)

  // Check if text contains "OFFER OF ADMISSION"
  if (regex.isTranscript(fullText)) {
    transcript = true;
  }

  if (!ecp && fullText.match(regex.extendedCredits)) {
    ecp = true;
  }

  if (!transcript) {
    alert('Please choose Offer of Admission');
    return { results: [] };
  }

  return {
    terms,
    courses,
    separators,
    degree: name,
    degreeId: id,
    ecp,
  };
}

/*
 ** Transform the raw transcript data into the desired format
 * @param {{ term: string; course: string; grade: string; }[]} transcriptData
 * @returns {{ term: string; courses: string[]; grade: string; }[]} - Array of objects with term, courses, and total grade (as string)
 * Groups courses by term and sums their grades
 * Sorts the result by term in chronological order
 */
function transformGradesData(transcriptData) {
  //? First, group courses by term
  const termsMap = transcriptData.reduce((acc, entry) => {
    if (!acc[entry.term]) {
      acc[entry.term] = {
        courses: [],
        grades: [],
      };
    }
    acc[entry.term].courses.push(entry.course);
    acc[entry.term].grades.push(parseFloat(entry.grade));
    return acc;
  }, {});

  const result = Object.keys(termsMap).map((term) => {
    const termData = termsMap[term]; // array of courses and credits for the term
    const totalCredits = termData.grades.reduce((sum, grade) => sum + grade, 0); // this is in fact total credits using the field named grade from the regex match which contains the credits for the regular course

    return {
      term,
      courses: termData.courses,
      grade: totalCredits.toString(),
    };
  });

  //? Sort by term (chronological order)
  result.sort((a, b) => {
    const [aSeason, aYear] = a.term.split(' ');
    const [bSeason, bYear] = b.term.split(' ');

    if (aYear !== bYear) return aYear - bYear;

    const seasonOrder = { Summer: 1, Fall: 2, Winter: 3 };
    return seasonOrder[aSeason] - seasonOrder[bSeason];
  });

  return result;
}

/**
 ** Match the extracted courses to the corresponding terms
 * Groups courses under their respective terms based on position
 * Handles exempted courses separately
 * @param {{ name: string; type: string; position: number; }[]} terms
 * @param {{ code: string; grade: string; position: number; type: string; }[]} courses
 * @param {{ position: number; }[]} separators
 * @returns {{ term: string; courses: string[]; grade: string; }[]} - Array of objects with term, courses, and total term credits - note that grade is in fact credits
 */
function matchCoursesToTerms(terms, courses, separators) {
  const exemptions = [];
  let currentTermIndex = 0;
  let currentTerm = terms[currentTermIndex]?.name || 'Unknown Term';

  // Group exempted courses separately
  const exemptedCourses = courses.filter((c) => c.type === 'Exempted');
  if (exemptedCourses.length > 0) {
    exemptions.push({
      term: 'Exempted 2020',
      courses: exemptedCourses.map((c) => c.code),
      grade: 'A',
    });
  }

  // Match regular courses to terms
  const regularCourses = courses.filter((c) => c.type === 'Course');
  const termBoundaries = separators; //terms.map((t) => t.position);

  let records = [];
  for (const course of regularCourses) {
    // Advance to the current term if course is after next term boundary
    while (
      currentTermIndex < termBoundaries.length - 1 &&
      course.position > termBoundaries[currentTermIndex + 1].position
    ) {
      currentTermIndex++;
      currentTerm = terms[currentTermIndex]?.name;
    }

    records.push({
      term: currentTerm,
      course: course.code,
      grade: course.grade,
    });
  }

  records = transformGradesData(records);

  const results = [...exemptions, ...records];

  return results;
}

export {
  degreeMap,
  cleanText,
  extractDegreeInfo,
  extractAcademicTerms,
  extractTermSeparators,
  extractAllCourses,
  extractTranscriptComponents,
  matchCoursesToTerms,
};
