import { ParsedData, ProgramInfo } from '../types/parsedData';

export class AcceptanceLetterParser {
  parse(text: string): ParsedData {
    const programInfo: ProgramInfo = {
      degree: '',
      isCoop: false,
      isExtendedCreditProgram: false,
    };

    // Extract Degree Concentration (everything after Program/Plan(s) and before Academic Load)
    const degreeMatch =
      /^\s*Program\/Plan\(s\):[ \t]*([^\n]*(?:\n(?!\s*Academic\s+Load)[^\n]*)*)/im.exec(
        text,
      ); // NOSONAR

    if (degreeMatch) {
      // Combine the two parts (if any) into a single Degree Concentration string
      programInfo.degree = (degreeMatch[1] + (degreeMatch[2] || '')).trim();
    }
    // Check for "Co-op Recommendation: Congratulations!"
    if (
      /Co-op Recommendation:\s*Congratulations!/.exec(text) ||
      /Co-op Program/.exec(text)
    ) {
      programInfo.isCoop = true;
    }

    if (/Extended Credit Program/.exec(text)) {
      programInfo.isExtendedCreditProgram = true;
    }
    // Extract Starting Semester (Term)
    programInfo.firstTerm = this.getTermFromText({
      text,
      startLabel: 'Session',
      endLabel: 'Minimum Program Length',
    });
    // Extract Expected Graduation Term (Winter 2024, Fall/Winter 2023-2024)
    programInfo.lastTerm = this.getTermFromText({
      text,
      startLabel: 'Expected Graduation Term',
      endLabel: 'Admission Status',
    });

    let minimumProgramLengthMatch = /Minimum Program Length:\s*(\d+)\s*credits?/i.exec(text)?.[1];
    if (minimumProgramLengthMatch)
      programInfo.minimumProgramLength =
        Number.parseInt(minimumProgramLengthMatch) || undefined;

    const parsedData: ParsedData = {
      programInfo: programInfo,
    };

    // Extract Exempted Courses
    parsedData.exemptedCourses = this.getCoursesFromText({
      text,
      startLabel: 'Exemptions:',
      endLabel: 'Deficiencies:',
    });

    // Extract Deficiency Courses
    parsedData.deficiencyCourses = this.getCoursesFromText({
      text,
      startLabel: 'Deficiencies:',
      endLabel: 'Transfer Credits:',
    });

    // Extract Transfer Credits
    parsedData.transferedCourses = this.getCoursesFromText({
      text,
      startLabel: 'Transfer Credits:',
      endLabel: 'ADDITIONAL INFORMATION',
    });
    return parsedData;
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
  private getTermFromText({
    text,
    startLabel,
    endLabel,
  }: {
    text: string;
    startLabel: string;
    endLabel: string;
  }): string | undefined {
    const section = this.getSectionBetweenLabels(text, startLabel, endLabel);
    if (!section) return undefined;
    // Regex for matching academic terms like "Winter 2024" or "Fall/Winter 2023-2024"
    const termRegex =
      /\b((Winter|Summer|Fall)\s*\d{4}|Fall\/Winter\s*20\d{2}-\d{2})\b/;
    const match = termRegex.exec(section);
    if (match) {
      return match[0].trim();
    }
    return undefined;
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
}
