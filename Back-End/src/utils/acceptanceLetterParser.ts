import { ParsedData } from '../types/transcript'; 
export class AcceptanceLetterParser {
 
parse = (text:string):ParsedData => {
  const result: ParsedData = {};

  // Extract Program Info
  const programInfo: any = {};

  // Extract Degree Concentration (everything after Program/Plan(s) and before Academic Load)
  const degreeConcentrationMatch = (/^\s*Program\/Plan\(s\):[ \t]*([^\n]*(?:\n(?!\s*Academic\s+Load)[^\n]*)*)/im).exec(text); // NOSONAR

  if (degreeConcentrationMatch) {
    programInfo.degree = (degreeConcentrationMatch[1] + (degreeConcentrationMatch[2] || '')).trim();
  }

  // Check for "Co-op Recommendation: Congratulations!"
  if ((/Co-op Recommendation:\s*Congratulations!/).exec(text) || (/Co-op Program/).exec(text)) {
    programInfo.isCoop = true;
  }

  if ((/Extended Credit Program/).exec(text)) {
    programInfo.isExtendedCreditProgram = true;
  }

  // Extract Starting Semester (Term)
  const startingTerm = this.extractTermFromText({
    text,
    startLabel: 'Session',
    endLabel: 'Minimum Program Length',
  });
  if (startingTerm) {
    programInfo.firstTerm = startingTerm;
  }

  // Extract Expected Graduation Term (Winter 2024, Fall/Winter 2023-2024)
  const expectedGraduationTerm = this.extractTermFromText({
    text,
    startLabel: 'Expected Graduation Term',
    endLabel: 'Admission Status',
  });
  if (expectedGraduationTerm) {
    programInfo.lastTerm = expectedGraduationTerm;
  }

  const minProgramLength = (/Minimum Program Length:\s*(\d+)\s*credits?/i).exec(text)?.[1];
  if (minProgramLength) {
    programInfo.minimumProgramLength = Number.parseInt(minProgramLength, 10);
  }

  if (Object.keys(programInfo).length > 0) {
    result.programInfo = programInfo;
  }

  // Extract Exempted Courses (always include, even if empty)
  const exemptions = this.getCoursesFromText({ text, startLabel: 'Exemptions:', endLabel: 'Deficiencies:' });
  result.exemptedCourses = exemptions;

  // Extract Deficiency Courses (always include, even if empty)
  const deficiencies = this.getCoursesFromText({ text, startLabel: 'Deficiencies:', endLabel: 'Transfer Credits:' });
  result.deficiencyCourses = deficiencies;

  // Extract Transfer Credits (always include, even if empty)
  const transferCredits = this.getCoursesFromText({
    text,
    startLabel: 'Transfer Credits:',
    endLabel: 'ADDITIONAL INFORMATION',
  });
  result.transferedCourses = transferCredits;

  // Generate semesters from startingTerm to expectedGraduationTerm
  const terms = this.generateTerms(startingTerm, expectedGraduationTerm);
  if (terms.length > 0) {
    result.semesters = terms.map((term: string) => ({
      term: term.trim(),
      courses: [] // Empty courses array for generated terms
    }));
  }

  return result;
};
   //Helper function to extract courses between two labels (text markers in the document that indicate the start and end of a section)
private getCoursesFromText({
  text,
  startLabel,
  endLabel,
}: {
  text: string;
  startLabel: string;
  endLabel: string;
}): string[] {
  // Regex for matching courses (e.g., COMM A, ECON 201)
  const courseRegex = /[A-Z]{3,4}\s+\d{3}/g;
  const sectionText = this.getSectionBetweenLabels(text, startLabel, endLabel);
  if (!sectionText) return [];
  const courses = [];
  let match;
  while ((match = courseRegex.exec(sectionText)) !== null) {
    const course = match[0].trim();
    courses.push(course.replaceAll(/\s+/g, ''));
  }
  return courses;
}
//Helper function to extract terms between two labels (text markers in the document that indicate the start and end of a section)
private extractTermFromText({
  text,
  startLabel,
  endLabel,
}: {
  text: string;
  startLabel: string;
  endLabel: string;
}): string | null {
  const section = this.getSectionBetweenLabels(text, startLabel, endLabel);
  if (!section) return null;
  // Regex for matching academic terms like "Winter 2024" or "Fall/Winter 2023-2024"
  const termRegex = /\b((Winter|Summer|Fall)\s*\d{4}|Fall\/Winter\s*20\d{2}-\d{2})\b/;
  const match = termRegex.exec(section);
  if (match) {
    return match[0].trim();
  }
  return null;
}

//Helper Function to get the text section between two labels
private getSectionBetweenLabels(text:string, startLabel:string, endLabel:string) {
  const startIndex = text.indexOf(startLabel);
  const endIndex = text.indexOf(endLabel);
  if (startIndex === -1 || endIndex === -1) return null;
  return text.substring(startIndex, endIndex);
}

// Function to generate all terms from startTerm to endTerm 
// this function is temporary and will be removed when the timeline functionality is reimplemented
private readonly generateTerms = (startTerm:string|null, endTerm:string|null) => {
  const terms = ['Winter', 'Summer', 'Fall'];
  if (!startTerm || typeof startTerm !== 'string') return [];
  const startYear = Number.parseInt(startTerm.split(' ')[1]); // Extracting the year
  const startSeason = startTerm.split(' ')[0]; // Extracting the season
  let endYear, endSeason;
  if (!endTerm || typeof endTerm !== 'string') {
    endYear = startYear + 2;
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
} 