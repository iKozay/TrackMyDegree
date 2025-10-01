import fs from 'fs';
import path from 'path';
import PDFParser from 'pdf2json';
import type {
  TransferCredit,
  TranscriptCourse,
  TranscriptTerm,
  StudentInfo,
  ProgramInfo,
  AdditionalInfo,
  ParsedTranscript,
  TranscriptParserOptions,
} from '@shared/types';


/**
 * TranscriptParser - A utility class to parse academic transcripts from PDF format
 *
 * This parser extracts student information, course details, grades, and GPA information
 * from transcript PDFs following standard academic transcript formats.
 *
 * @example
 * ```typescript
 * const parser = new TranscriptParser();
 * const transcript = await parser.parseFromFile('/path/to/transcript.pdf');
 * console.log(transcript.studentInfo);
 * console.log(transcript.overallGPA);
 * ```
 */
export class TranscriptParser {
  private options: TranscriptParserOptions;

  constructor(options: TranscriptParserOptions = {}) {
    this.options = {
      validateCourseCode: true,
      extractGPA: true,
      extractTermInfo: true,
      ...options
    };
  }

  /**
   * Parse a transcript from a PDF file path
   */
  async parseFromFile(filePath: string): Promise<ParsedTranscript> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      return await this.parseFromBuffer(dataBuffer);
    } catch (error) {
      throw new Error(`Failed to read transcript file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse a transcript from a Buffer
   */
  async parseFromBuffer(buffer: Buffer): Promise<ParsedTranscript> {
    return new Promise((resolve, reject) => {
      const pdfParser = new (PDFParser as any)(null, 1);

      pdfParser.on('pdfParser_dataError', (errData: any) => {
        reject(new Error(`PDF parsing error: ${errData.parserError}`));
      });

      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          const transcript = this.parseTranscriptData(pdfData);
          resolve(transcript);
        } catch (error) {
          reject(error);
        }
      });

      // pdf2json expects a file path, so we need to write temp file
      const tempPath = path.join('/tmp', `transcript_${Date.now()}.pdf`);
      fs.writeFileSync(tempPath, buffer);
      
      pdfParser.loadPDF(tempPath);
      
      // Clean up temp file after a delay
      setTimeout(() => {
        try {
          fs.unlinkSync(tempPath);
        } catch (e) {
          // Ignore cleanup errors
        }
      }, 5000);
    });
  }

  /**
   * Parse the PDF data structure from pdf2json
   */
  private parseTranscriptData(pdfData: any): ParsedTranscript {
    // Extract text from all pages
    const allText: string[] = [];
    const pages = pdfData.Pages || [];

    pages.forEach((page: any) => {
      if (page.Texts) {
        // Group texts by Y coordinate to reconstruct lines
        const textsByY = new Map<number, Array<{ x: number; text: string }>>();

        page.Texts.forEach((textItem: any) => {
          const y = Math.round(textItem.y * 100);
          const x = textItem.x;
          const text = decodeURIComponent(textItem.R?.[0]?.T || '');

          if (!textsByY.has(y)) {
            textsByY.set(y, []);
          }
          textsByY.get(y)!.push({ x, text });
        });

        // Sort by Y and then X to reconstruct lines
        // Use | as separator to preserve column structure (like in table)
        const sortedLines = Array.from(textsByY.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([y, texts]) => {
            const sortedTexts = texts.sort((a, b) => a.x - b.x);
            return sortedTexts.map(t => t.text).join(' | ');
          });

        allText.push(...sortedLines);
      }
    });

    const lines = allText.filter(line => line.trim().length > 0);

    const studentInfo = this.extractStudentInfo(lines);
    const programHistory = this.extractProgramHistory(lines);
    const additionalInfo = this.extractAcademicSummary(lines);
    const transferCredits = this.extractTransferCredits(lines);
    const terms = this.extractTerms(lines);

    return {
      studentInfo,
      programHistory,
      transferCredits,
      terms,
      additionalInfo
    };
  }

  /**
   * Extract student information
   */
  private extractStudentInfo(lines: string[]): StudentInfo {
    const studentInfo: StudentInfo = {};

    for (let i = 0; i < Math.min(lines.length, 50); i++) {
      const line = lines[i];

      if (i < lines.length - 1 && lines[i + 1].startsWith('Student ID:') && 
          !line.includes('http') && !line.includes('Page') && line.length > 5 && line.length < 100) {
        studentInfo.studentName = line;
      }

      if (line.startsWith('Student ID:')) {
        const idMatch = line.match(/Student ID:\s*(\d+)/);
        if (idMatch) studentInfo.studentId = idMatch[1];
      }

      if (i > 0 && lines[i - 1].startsWith('Student ID:') && !line.includes(',') && !line.includes('Canada')) {
        studentInfo.address = line;
      }

      if (line.includes(', QC') || line.includes(', ON') || line.includes(', BC')) {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 2) {
          studentInfo.city = parts[0];
          studentInfo.province = parts[1];
        }
      }

      if (line.startsWith('Canada')) {
        studentInfo.country = 'Canada';
        const postalMatch = line.match(/([A-Z]\d[A-Z]\s?\d[A-Z]\d)/);
        if (postalMatch) studentInfo.postalCode = postalMatch[1];
      }

      if (line.startsWith('Birthdate:')) {
        const birthdateMatch = line.match(/Birthdate:\s*(.+)/);
        if (birthdateMatch) studentInfo.birthdate = birthdateMatch[1].trim();
      }

      if (line.startsWith('Permanent Code:')) {
        const codeMatch = line.match(/Permanent Code:\s*(.+)/);
        if (codeMatch) studentInfo.permanentCode = codeMatch[1].trim();
      }

      if (line.startsWith('Telephone:')) {
        const phoneMatch = line.match(/Telephone:\s*(.+)/);
        if (phoneMatch) studentInfo.telephone = phoneMatch[1].trim();
      }
    }

    return studentInfo;
  }

  /**
   * Extract program history
   */
  private extractProgramHistory(lines: string[]): ProgramInfo[] {
    const programs: ProgramInfo[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line === 'Active in Program') {
        const date = i + 1 < lines.length ? lines[i + 1] : '';
        let degreeType = '';
        let major = '';
        let note = '';
        let admitTerm = '';
        
        for (let j = i + 2; j < Math.min(i + 10, lines.length); j++) {
          if (lines[j].includes('Bachelor of') || lines[j].includes('Master of')) {
            degreeType = lines[j];
          } else if (lines[j].includes('Engineering') && !lines[j].includes('Bachelor') && !degreeType.includes(lines[j])) {
            major = lines[j];
          } else if (lines[j].includes('Admit Term')) {
            admitTerm = j + 1 < lines.length ? lines[j + 1] : '';
          } else if (lines[j].includes('Matriculated') || lines[j].includes('Member Institute') || lines[j].includes('Concentration Change')) {
            note = lines[j];
          } else if (lines[j] === 'Active in Program' || lines[j].includes('Min. Credits Required')) {
            break;
          }
        }
        
        programs.push({
          status: 'Active in Program',
          startDate: date,
          admitTerm,
          degreeType,
          major,
          note
        });
      }
    }

    return programs;
  }

  /**
   * Extract transfer credits from prior institutions
   */
  private extractTransferCredits(lines: string[]): TransferCredit[] {
    const transferCredits: TransferCredit[] = [];

    for (const line of lines) {
      // Skip lines without pipe separators
      if (!line.includes(' | ')) {
        continue;
      }

      const parts = line.split(' | ').map(p => p.trim());

      // Look for transfer credit pattern: DEPT | NUMBER | DESCRIPTION | GRADE | YEAR/NA | CREDITS
      // They appear in lines with "YEAR ATTENDED" header
      if (line.includes('YEAR ATTENDED')) {
        // Scan through parts looking for transfer credit courses
        for (let i = 0; i < parts.length - 5; i++) {
          const dept = parts[i];
          const number = parts[i + 1];
          const description = parts[i + 2];
          const grade = parts[i + 3];
          const year = parts[i + 4];
          const credits = parts[i + 5];

          // Check if this looks like a transfer credit
          if (/^[A-Z]{2,4}$/.test(dept) && 
              /^\d{3}$/.test(number) && 
              (grade === 'EX' || grade === 'PASS') &&
              /^\d+\.?\d*$/.test(credits)) {
            
            transferCredits.push({
              courseCode: `${dept} ${number}`,
              courseTitle: description,
              grade: grade,
              yearAttended: year !== 'NA' ? year : undefined,
              programCreditsEarned: parseFloat(credits)
            });
          }
        }
      }
    }

    return transferCredits;
  }

  /**
   * Extract academic summary
   */
  private extractAcademicSummary(lines: string[]): AdditionalInfo {
    const info: AdditionalInfo = {};
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line === 'Min. Credits Required:' && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (/^\d+\.?\d*$/.test(nextLine)) {
          info.minCreditsRequired = parseFloat(nextLine);
        }
      }
      
      if (line === 'Program Credits Earned:' && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (/^\d+\.?\d*$/.test(nextLine)) {
          info.programCreditsEarned = parseFloat(nextLine);
        }
      }
      
      if (line === 'Cumulative GPA:' && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (/^\d+\.?\d*$/.test(nextLine)) {
          info.overallGPA = parseFloat(nextLine);
        }
      }
      
      if (line.startsWith('Writing Skills Requirement:')) {
        const reqMatch = line.match(/Writing Skills Requirement:\s*(.+)/);
        if (reqMatch) info.writingSkillsRequirement = reqMatch[1].trim();
      }
    }
    
    return info;
  }

  /**
   * Extract terms and courses using improved table parsing
   */
  private extractTerms(lines: string[]): TranscriptTerm[] {
    const terms: TranscriptTerm[] = [];
    let currentTerm: TranscriptTerm | null = null;
    let inProgramHistory = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Track if we're in program history section
      if (line.includes('Active in Program') || line.includes('Program History')) {
        inProgramHistory = true;
      }
      
      // Exit program history when we hit academic info or transfer credits
      if (line.includes('Cumulative GPA') || line.includes('Transfer Credits') || 
          line.includes('Min. Credits Required') || line.includes('COURSE') && line.includes('DESCRIPTION')) {
        inProgramHistory = false;
      }

      // Detect term headers (but NOT when in program history section)
      const termMatch = line.match(/^(Winter|Summer|Fall|Spring)\s+(\d{4})$/);
      if (termMatch && !inProgramHistory) {
        // Additional safety: make sure this is not right after "Admit Term"
        const isAdmitTerm = i > 0 && lines[i - 1].includes('Admit Term');
        
        if (!isAdmitTerm) {
          if (currentTerm) {
            terms.push(currentTerm);
          }
          
          currentTerm = {
            term: termMatch[1],
            year: termMatch[2],
            courses: [],
            termGPA: undefined,
            termCredits: undefined
          };
          continue;
        }
      }

      if (currentTerm) {
        // Parse course lines - may contain multiple courses in one line
        const courses = this.extractCoursesFromLine(line);
        if (courses.length > 0) {
          courses.forEach(course => {
            course.term = currentTerm!.term;
            course.year = currentTerm!.year;
            currentTerm!.courses.push(course);
          });
        }

        // Extract term GPA
        if (line.startsWith('Term GPA')) {
          const gpaMatch = line.match(/Term GPA\s+(\d+\.?\d*)/);
          if (gpaMatch) {
            currentTerm.termGPA = parseFloat(gpaMatch[1]);
          }
        }
      }
    }

    if (currentTerm) {
      terms.push(currentTerm);
    }

    // Merge duplicate terms (same term and year)
    const mergedTerms = this.mergeDuplicateTerms(terms);

    return mergedTerms;
  }

  /**
   * Merge duplicate terms with the same term and year
   * This handles cases where the transcript mentions the same term multiple times
   */
  private mergeDuplicateTerms(terms: TranscriptTerm[]): TranscriptTerm[] {
    const termMap = new Map<string, TranscriptTerm>();

    terms.forEach(term => {
      const key = `${term.term}-${term.year}`;
      
      if (termMap.has(key)) {
        // Merge into existing term
        const existing = termMap.get(key)!;
        existing.courses.push(...term.courses);
        
        // Use the GPA from the term that has one (prefer non-undefined)
        if (term.termGPA !== undefined && existing.termGPA === undefined) {
          existing.termGPA = term.termGPA;
        }
        if (term.termCredits !== undefined && existing.termCredits === undefined) {
          existing.termCredits = term.termCredits;
        }
      } else {
        // New term
        termMap.set(key, { ...term });
      }
    });

    return Array.from(termMap.values());
  }

  /**
   * Extract all courses from a line (may contain multiple courses)
   * The line format from pdf2json has courses with pipe separators:
   * ... | DEPT | NUMBER | SECTION | TITLE_PARTS | ... | CREDITS | GRADE | GPA | AVG | SIZE | EARNED | OTHER | ...
   */
  private extractCoursesFromLine(line: string): TranscriptCourse[] {
    const courses: TranscriptCourse[] = [];
    
    // Skip lines without pipe separators
    if (!line.includes(' | ')) {
      return courses;
    }

    // Split by pipe separator
    const parts = line.split(' | ').map(p => p.trim());

    // Scan through parts looking for course patterns: DEPT | NUMBER | SECTION
    for (let i = 0; i < parts.length - 2; i++) {
      const dept = parts[i];
      const number = parts[i + 1];
      const section = parts[i + 2];

      // Check if this looks like a course: DEPT (2-4 letters) | NUMBER (3 digits) | SECTION (1-3 chars)
      if (/^[A-Z]{2,4}$/.test(dept) && /^\d{3}$/.test(number) && /^[A-Z0-9]{1,3}$/.test(section)) {
        const course = this.parseCourseFromParts(parts, i);
        if (course) {
          courses.push(course);
        }
      }
    }

    return courses;
  }

  /**
   * Parse a single course starting at the given index in the parts array
   * Expected format: DEPT | NUMBER | SECTION | TITLE_PARTS... | CREDITS | GRADE | [GPA | AVG | SIZE | EARNED] | [OTHER]
   */
  private parseCourseFromParts(parts: string[], startIndex: number): TranscriptCourse | null {
    if (startIndex + 5 >= parts.length) {
      return null; // Not enough parts
    }

    const dept = parts[startIndex];
    const number = parts[startIndex + 1];
    const section = parts[startIndex + 2];
    const courseCode = `${dept} ${number}`;

    // Collect title parts until we hit a credits value (N.NN format)
    let courseTitle = '';
    let titleIndex = startIndex + 3;
    while (titleIndex < parts.length && !/^\d+\.\d{2}$/.test(parts[titleIndex])) {
      courseTitle += parts[titleIndex] + ' ';
      titleIndex++;
      // Safety: stop if we've gone too far
      if (titleIndex - startIndex > 15) break;
    }
    courseTitle = courseTitle.trim();

    // Next should be credits
    if (titleIndex >= parts.length || !/^\d+\.\d{2}$/.test(parts[titleIndex])) {
      return null;
    }
    const credits = parseFloat(parts[titleIndex]);
    titleIndex++;

    // Next should be grade
    if (titleIndex >= parts.length) {
      return null;
    }
    const grade = parts[titleIndex].toUpperCase();
    titleIndex++;

    let gpa: number | undefined;
    let classAvg: number | undefined;
    let classSize: number | undefined;
    let programCredits: number | undefined;
    let other: string | undefined;

    // For letter grades (not PASS, EX, etc.), we have GPA, AVG, SIZE, EARNED
    if (grade !== 'PASS' && grade !== 'EX') {
      // GPA
      if (titleIndex < parts.length && /^\d+\.\d{2}$/.test(parts[titleIndex])) {
        gpa = parseFloat(parts[titleIndex]);
        titleIndex++;
      }

      // Class Average
      if (titleIndex < parts.length && /^\d+\.\d{2}$/.test(parts[titleIndex])) {
        classAvg = parseFloat(parts[titleIndex]);
        titleIndex++;
      }

      // Class Size
      if (titleIndex < parts.length && /^\d{1,4}$/.test(parts[titleIndex])) {
        classSize = parseInt(parts[titleIndex]);
        titleIndex++;
      }

      // Program Credits Earned
      if (titleIndex < parts.length && /^\d+\.\d{2}$/.test(parts[titleIndex])) {
        programCredits = parseFloat(parts[titleIndex]);
        titleIndex++;
      }
    } else {
      // For PASS/EX grades, skip to earned credits
      // Skip ahead to find the credits earned (should be N.NN)
      while (titleIndex < parts.length && !/^\d+\.\d{2}$/.test(parts[titleIndex])) {
        titleIndex++;
      }
      if (titleIndex < parts.length) {
        programCredits = parseFloat(parts[titleIndex]);
        titleIndex++;
      }
    }

    // Check for OTHER field (WKRT, RPT, etc.)
    if (titleIndex < parts.length && ['WKRT', 'RPT', 'EX'].includes(parts[titleIndex])) {
      other = parts[titleIndex];
    }

    return {
      courseCode,
      section,
      courseTitle,
      credits,
      grade,
      notation: undefined,
      gpa,
      classAvg,
      classSize,
      gradePoints: gpa ? gpa * credits : undefined,
      term: '',
      year: '',
      other
    };
  }
}

export default TranscriptParser;

