import { ParsedAcceptanceLetter, AcceptanceDetails } from '../types/transcript';
export class AcceptanceLetterParser {
  parse = (text: string): ParsedAcceptanceLetter => {
    const details: AcceptanceDetails = {
      degreeConcentration: null,
      coopProgram: false,
      extendedCreditProgram: false,
      startingTerm: null,
      expectedGraduationTerm: null,
      minimumProgramLength: null,
    };
    const extractedCourses = [];

    // NOSONAR : Extract Degree Concentration (everything after Program/Plan(s) and before Academic Load)
    const degreeConcentrationMatch =
      /^\s*Program\/Plan\(s\):[ \t]*([^\n]*(?:\n(?!\s*Academic\s+Load)[^\n]*)*)/im.exec(
        text,
      ); // NOSONAR

    if (degreeConcentrationMatch) {
      // Combine the two parts (if any) into a single Degree Concentration string
      details.degreeConcentration = (
        degreeConcentrationMatch[1] + (degreeConcentrationMatch[2] || '')
      ).trim(); // Add Degree Concentration to details
    }
    // Check for "Co-op Recommendation: Congratulations!"
    if (
      /Co-op Recommendation:\s*Congratulations!/.exec(text) ||
      /Co-op Program/.exec(text)
    ) {
      details.coopProgram = true;
    }

    if (/Extended Credit Program/.exec(text)) {
      details.extendedCreditProgram = true;
    }
    // Extract Starting Semester (Term)
    details.startingTerm = this.extractTermFromText({
      text,
      startLabel: 'Session',
      endLabel: 'Minimum Program Length',
    });
    // Extract Expected Graduation Term (Winter 2024, Fall/Winter 2023-2024)
    details.expectedGraduationTerm = this.extractTermFromText({
      text,
      startLabel: 'Expected Graduation Term',
      endLabel: 'Admission Status',
    });

    details.minimumProgramLength =
      /Minimum Program Length:\s*(\d+)\s*credits?/i.exec(text)?.[1] || null;

    // Extract Exempted Courses
    const exemptions = this.getCoursesFromText({
      text,
      startLabel: 'Exemptions:',
      endLabel: 'Deficiencies:',
    });
    if (exemptions.length > 0)
      extractedCourses.push({
        term: 'Exempted',
        courses: exemptions,
        grade: 'EX',
      });

    // Extract Deficiency Courses
    const deficiencies = this.getCoursesFromText({
      text,
      startLabel: 'Deficiencies:',
      endLabel: 'Transfer Credits:',
    });
    if (deficiencies.length > 0)
      extractedCourses.push({
        term: 'Deficiencies',
        courses: deficiencies,
        grade: 'DF',
      });

    // Extract Transfer Credits
    const transferCredits = this.getCoursesFromText({
      text,
      startLabel: 'Transfer Credits:',
      endLabel: 'ADDITIONAL INFORMATION',
    });
    if (transferCredits.length > 0)
      extractedCourses.push({
        term: 'Transfered Courses',
        courses: transferCredits,
        grade: 'TR',
      });

    // Generate all terms from startingTerm to expectedGraduationTerm
    const terms = this.generateTerms(
      details.startingTerm,
      details.expectedGraduationTerm,
    );
    terms.forEach((term: string) => {
      extractedCourses.push({
        term: term.trim(),
        course: '',
        grade: null,
      });
    });

    return { extractedCourses, details };
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
    const sectionText = this.getSectionBetweenLabels(
      text,
      startLabel,
      endLabel,
    );
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
    const termRegex =
      /\b((Winter|Summer|Fall)\s*\d{4}|Fall\/Winter\s*20\d{2}-\d{2})\b/;
    const match = termRegex.exec(section);
    if (match) {
      return match[0].trim();
    }
    return null;
  }

  //Helper Function to get the text section between two labels
  private getSectionBetweenLabels(
    text: string,
    startLabel: string,
    endLabel: string,
  ) {
    const startIndex = text.indexOf(startLabel);
    const endIndex = text.indexOf(endLabel);
    if (startIndex === -1 || endIndex === -1) return null;
    return text.substring(startIndex, endIndex);
  }

  // Function to generate all terms from startTerm to endTerm
  // this function is temporary and will be removed when the timeline functionality is reimplemented
  private readonly generateTerms = (
    startTerm: string | null,
    endTerm: string | null,
  ) => {
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
    while (
      currentYear < endYear ||
      (currentYear === endYear &&
        currentSeasonIndex <= terms.indexOf(endSeason))
    ) {
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
