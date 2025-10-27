import { pdfjs } from 'react-pdf';

//Reads the PDF as an array buffer. The text is extracted using PDF.js
// TODO: Move processing logic to seeparate utility file
const parsePdfFile = (file) => {
  // Set the worker source for PDF.js
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const typedArray = new Uint8Array(e.target.result);

      pdfjs
        .getDocument(typedArray)
        .promise.then((pdf) => {
          let pagesPromises = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            pagesPromises.push(
              pdf.getPage(i).then((page) => {
                return page.getTextContent().then((textContentPage) => {
                  return {
                    page: i,
                    text: textContentPage.items.map((item) => item.str).join(' '),
                  };
                });
              }),
            );
          }

          Promise.all(pagesPromises).then(resolve).catch(reject);
        })
        .catch(reject);
    };

    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

//This is a helper function used to get the details about the program (Mapped to an id), Coop/Extended Credit/Credit deficiency, starting term, exemptions/transfer credits/deficiencies.
//This function generates all terms between the start end expected end terms
//Returns a structured object
// TODO: Refactor to simplify this complex function
const extractAcceptanceDetails = (pagesData) => {
  const details = {};

  let results = [];

  let offer_of_Admission = false;
  pagesData.forEach(({ text }) => {
    if (!pagesData || pagesData.length === 0) {
      console.error('No pages data available');
      return { results: [] };
    }
    // Check if text contains "OFFER OF ADMISSION"
    if (text.toUpperCase().match('OFFER OF ADMISSION')) {
      offer_of_Admission = true;
    }

    // Extract Degree Concentration (everything after Program/Plan(s) and before Academic Load)
    const degreeConcentrationMatch = text.match(/Program\/Plan\(s\):\s*([^\n]+)(?:\n([^\n]+))?[\s\S]*?Academic Load/);

    if (degreeConcentrationMatch) {
      // Combine the two parts (if any) into a single Degree Concentration string
      details.degreeConcentration = (degreeConcentrationMatch[1] + (degreeConcentrationMatch[2] || '')).trim(); // Add Degree Concentration to details
    }
    // Check for "Co-op Recommendation: Congratulations!"
    const coopRecommendationMatch = text.match(/Co-op Recommendation:\s*Congratulations!/);
    if (coopRecommendationMatch) {
      details.coopProgram = 'Yes';
      details.extendedCreditProgram = 'No'; //I don't think this is always true
    } else {
      // Extract Extended Credit Program or Co-op Program if not determined by Co-op Recommendation
      // TODO: Check with the advisor if the ecp and coop are mutually exclusive
      const ecpMatch = text.match(/Extended Credit Program/);
      const coopMatch = text.match(/Co-op Program/);
      if (ecpMatch) {
        details.extendedCreditProgram = 'yes';
        details.coopProgram = 'No';
      } else if (coopMatch) {
        details.coopProgram = 'Yes';
        details.extendedCreditProgram = 'No';
      }
    }
    // Extract Starting Semester (Term)
    extractTermFromText({
      text,
      startLabel: 'Session',
      endLabel: 'Minimum Program Length',
      targetField: 'startingTerm',
      details,
    });
    // Extract Expected Graduation Term (Winter 2024, Fall/Winter 2023-2024)
    extractTermFromText({
      text,
      startLabel: 'Expected Graduation Term',
      endLabel: 'Admission Status',
      targetField: 'expectedGraduationTerm',
      details,
    });
    // Extract Exempted Courses
    extractCoursesFromText({
      text,
      startLabel: 'Exemptions',
      endLabel: 'Deficiencies',
      courseType: 'Exempted',
      results,
      targetField: 'exemptionsCourses',
      details,
    });

    // Extract Deficiency Courses
    extractCoursesFromText({
      text,
      startLabel: 'Deficiencies',
      endLabel: 'Transfer Credits',
      courseType: 'Deficiency',
      results,
      targetField: 'deficienciesCourses',
      details,
    });
    // Extract Transfer Credits
    extractCoursesFromText({
      text,
      startLabel: 'Transfer Credits',
      endLabel: 'NOTE:',
      courseType: 'Transfered Courses',
      results,
      targetField: 'transferCredits',
      details,
    });
  }); // pages end

  if (!offer_of_Admission) {
    alert('Please choose Offer of Admission');
    return { results: [] };
  }

  // Generate all terms from startingTerm to expectedGraduationTerm
  const terms = generateTerms(details.startingTerm, details.expectedGraduationTerm);
  terms.forEach((term) => {
    results.push({
      term: term.trim(),
      course: '',
      grade: 'EX',
    });
  });

  return { results, details };
};
//Helper function to extract terms between two labels (text markers in the document that indicate the start and end of a section)
function extractTermFromText({ text, startLabel, endLabel, targetField, details }) {
  const section = getSectionBetweenLabels(text, startLabel, endLabel);
  if (!section) return;
  // Regex for matching academic terms like "Winter 2024" or "Fall/Winter 2023-2024"
  const termRegex = /(\s*(Winter|Summer|Fall)\s*\d{4}\s*)|(\s*(Fall\/Winter)\s*20(\d{2})-(?!\6)\d{2})/;
  const match = section.match(termRegex);

  if (match) {
    details[targetField] = match[0].trim();
  }
}
//Helper function to extract courses between two labels (text markers in the document that indicate the start and end of a section)
function extractCoursesFromText({ text, startLabel, endLabel, courseType, results, targetField, details }) {
  // Regex for matching courses (e.g., COMM A, ECON 201)
  const courseRegex = /[A-Z]{3,4}\s+\d{3}/g;
  const creditRegex = /\b\d{1,5}\s{1,3}crs\b/; // Regex for matching credits (e.g., "3 crs")
  const sectionText = getSectionBetweenLabels(text, startLabel, endLabel);
  const courses = [];
  let match;

  while ((match = courseRegex.exec(sectionText)) !== null) {
    const course = match[0].trim();
    let courseInfo = course;
    if (courseType !== 'Deficiency') {
      results.push({
        course: course.replace(/\s+/g, ''),
        term: courseType,
        grade: 'EX',
      });
    }
    //if it's a transfer course, look for credits
    if (courseType === 'Transfered Courses') {
      const lineContainingCourse = sectionText.split('\n').find((line) => line.includes(course));
      const creditMatch = lineContainingCourse?.match(creditRegex);
      const credits = creditMatch ? `${creditMatch[1]} crs` : 'Credits not found';
      courseInfo = { course, credits };
    }
    courses.push(courseInfo);
  }
  if (courses.length > 0) details[targetField] = courses;
}
function getSectionBetweenLabels(text, startLabel, endLabel) {
  const startIndex = text.indexOf(startLabel);
  const endIndex = text.indexOf(endLabel);
  if (startIndex === -1 || endIndex === -1) return null;
  return text.substring(startIndex, endIndex);
}
// Function to generate all terms from startTerm to endTerm
const generateTerms = (startTerm, endTerm) => {
  const terms = ['Winter', 'Summer', 'Fall'];
  const startYear = parseInt(startTerm.split(' ')[1]); // Extracting the year
  const startSeason = startTerm.split(' ')[0]; // Extracting the season
  let endYear, endSeason;
  if (!endTerm || typeof endTerm !== 'string') {
    endYear = startYear + 2;
    endSeason = startSeason;
  } else {
    endYear = parseInt(endTerm.split(' ')[1]); // Extracting the year
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

export { parsePdfFile, extractAcceptanceDetails };
