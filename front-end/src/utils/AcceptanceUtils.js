import { pdfjs } from 'react-pdf';

//Reads the PDF as an array buffer. The text is extracted using PDF.js
const parsePdfFile = (file) => {
  // Set the worker source for PDF.js
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const typedArray = new Uint8Array(e.target.result);
        const pdf = await pdfjs.getDocument(typedArray).promise;

        let allText = '';

        // Start from page 2 to skip the first page
        for (let i = 2; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item) => item.str).join(' ');
          allText += pageText;
        }

        resolve(allText);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

//This is a helper function used to get the details about the program (Mapped to an id), Coop/Extended Credit/Credit deficiency, starting term, exemptions/transfer credits/deficiencies.
//This function generates all terms between the start end expected end terms
//Returns a structured object
const extractAcceptanceDetails = (text) => {
  const details = {};

  let results = [];

  if (!text || text.length === 0) {
    console.error('No pages data available');
    return { results, details };
  }
  // Check if text contains "OFFER OF ADMISSION"
  if (!text.toUpperCase().match('OFFER OF ADMISSION')) {
    alert('Please upload an acceptance letter');
    return { results, details };
  }

  // Extract Degree Concentration (everything after Program/Plan(s) and before Academic Load)
  const degreeConcentrationMatch = text.match(/Program\/Plan\(s\):\s*([^\n]+)(?:\n([^\n]+))?[\s\S]*?Academic Load/);

  if (degreeConcentrationMatch) {
    // Combine the two parts (if any) into a single Degree Concentration string
    details.degreeConcentration = (degreeConcentrationMatch[1] + (degreeConcentrationMatch[2] || '')).trim(); // Add Degree Concentration to details
  }
  // Check for "Co-op Recommendation: Congratulations!"
  if (text.match(/Co-op Recommendation:\s*Congratulations!/) || text.match(/Co-op Program/)) {
    details.coopProgram = true;
  }

  if (text.match(/Extended Credit Program/)) {
    details.extendedCreditProgram = true;
  }
  // Extract Starting Semester (Term)
  details.startingTerm = extractTermFromText({
    text,
    startLabel: 'Session',
    endLabel: 'Minimum Program Length',
  });
  // Extract Expected Graduation Term (Winter 2024, Fall/Winter 2023-2024)
  details.expectedGraduationTerm = extractTermFromText({
    text,
    startLabel: 'Expected Graduation Term',
    endLabel: 'Admission Status',
  });

  details.minimumProgramLength = text.match(/Minimum Program Length:\s*(\d+)\s*credits?/i)?.[1] || null;

  // Extract Exempted Courses
  const exemptions = getCoursesFromText({ text, startLabel: 'Exemptions:', endLabel: 'Deficiencies:' });
  if (exemptions.length > 0) results.push({ term: 'Exempted', courses: exemptions });

  // Extract Deficiency Courses
  const deficiencies = getCoursesFromText({ text, startLabel: 'Deficiencies:', endLabel: 'Transfer Credits:' });
  if (deficiencies.length > 0) results.push({ term: 'Deficiencies', courses: deficiencies });

  // Extract Transfer Credits
  const transferCredits = getCoursesFromText({
    text,
    startLabel: 'Transfer Credits:',
    endLabel: 'ADDITIONAL INFORMATION',
  });
  if (transferCredits.length > 0) results.push({ term: 'Transfered Courses', courses: transferCredits });

  // Generate all terms from startingTerm to expectedGraduationTerm
  const terms = generateTerms(details.startingTerm, details.expectedGraduationTerm);
  terms.forEach((term) => {
    results.push({
      term: term.trim(),
      course: '',
    });
  });

  return { results, details };
};
//Helper function to extract terms between two labels (text markers in the document that indicate the start and end of a section)
function extractTermFromText({ text, startLabel, endLabel }) {
  const section = getSectionBetweenLabels(text, startLabel, endLabel);
  if (!section) return;
  // Regex for matching academic terms like "Winter 2024" or "Fall/Winter 2023-2024"
  const termRegex = /\b((Winter|Summer|Fall)\s*\d{4}|Fall\/Winter\s*20\d{2}-\d{2})\b/;
  const match = section.match(termRegex);
  if (match) {
    return match[0].trim();
  }
  return null;
}
//Helper function to extract courses between two labels (text markers in the document that indicate the start and end of a section)
function getCoursesFromText({ text, startLabel, endLabel }) {
  // Regex for matching courses (e.g., COMM A, ECON 201)
  const courseRegex = /[A-Z]{3,4}\s+\d{3}/g;
  const sectionText = getSectionBetweenLabels(text, startLabel, endLabel);
  const courses = [];
  let match;
  while ((match = courseRegex.exec(sectionText)) !== null) {
    const course = match[0].trim();
    courses.push(course.replace(/\s+/g, ''));
  }
  return courses;
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
