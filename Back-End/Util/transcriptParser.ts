import fs from 'fs';
import path from 'path';
import PDFParser from 'pdf2json';
import pdfParse from 'pdf-parse';
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
   * Uses BOTH pdf-parse (for term detection) and pdf2json (for structured course data)
   */
  async parseFromBuffer(buffer: Buffer): Promise<ParsedTranscript> {
    try {
      // Step 1: Use pdf-parse to get clean text with correct reading order
      const pdfParseData = await pdfParse(buffer);
      const cleanText = pdfParseData.text;
      
      // Step 2: Use pdf2json to get structured data with columns
      const pdf2jsonData = await new Promise<any>((resolve, reject) => {
        const pdfParser = new (PDFParser as any)(null, 1);

        pdfParser.on('pdfParser_dataError', (errData: any) => {
          reject(new Error(`PDF parsing error: ${errData.parserError}`));
        });

        pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
          resolve(pdfData);
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

      // Step 3: Parse using both sources
      const transcript = this.parseTranscriptDataHybrid(cleanText, pdf2jsonData);
      return transcript;
      
    } catch (error) {
      throw new Error(`Failed to parse transcript: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Hybrid parsing method using both pdf-parse and pdf2json
   */
  private parseTranscriptDataHybrid(cleanText: string, pdf2jsonData: any): ParsedTranscript {
    // Use pdf-parse to find term boundaries
    const lines = cleanText.split('\n');
    const termBoundaries = this.findTermBoundariesFromText(lines);
    
    // Use pdf2json to get structured course data
    const structuredLines = this.extractStructuredLines(pdf2jsonData);
    
    // Build student info and metadata from clean text
    const studentInfo = this.extractStudentInfo(structuredLines);
    const programHistory = this.extractProgramHistory(structuredLines);
    const additionalInfo = this.extractAcademicSummary(structuredLines);
    const transferCredits = this.extractTransferCredits(structuredLines);
    
    // Extract courses using term boundaries from pdf-parse and structure from pdf2json
    const terms = this.extractTermsHybrid(termBoundaries, structuredLines);

    return {
      studentInfo,
      programHistory,
      transferCredits,
      terms,
      additionalInfo
    };
  }

  /**
   * Find term boundaries from pdf-parse text (correct reading order)
   */
  private findTermBoundariesFromText(lines: string[]): Array<{ term: string; year: string; lineIndex: number; gpa?: number }> {
    const termBoundaries: Array<{ term: string; year: string; lineIndex: number; gpa?: number }> = [];
    let inCourseSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.includes('Beginning of Undergraduate Record')) {
        inCourseSection = true;
        continue;
      }
      
      if (line.includes('End of Student Record')) {
        break;
      }
      
      if (!inCourseSection) continue;
      
      // Match term headers
      const termMatch = line.match(/^(Winter|Summer|Fall|Spring|Fall\/Winter|Winter\/Summer)\s+(\d{4}(?:-\d{2})?)$/);
      if (termMatch) {
        termBoundaries.push({
          term: termMatch[1],
          year: termMatch[2],
          lineIndex: i
        });
      }
      
      // Match Term GPA and associate with last term
      if (line.startsWith('Term GPA') && termBoundaries.length > 0) {
        const gpaMatch = line.match(/Term GPA\s+(\d+\.?\d*)/);
        if (gpaMatch) {
          termBoundaries[termBoundaries.length - 1].gpa = parseFloat(gpaMatch[1]);
        }
      }
    }
    
    return termBoundaries;
  }

  /**
   * Extract structured lines from pdf2json (with column separation)
   * CRITICAL: Use ORIGINAL pdf2json order, NOT Y-sorted!
   */
  private extractStructuredLines(pdfData: any): string[] {
    // Extract text from all pages in ORIGINAL ORDER
    const allTextItems: Array<{ page: number; order: number; y: number; text: string }> = [];
    const pages = pdfData.Pages || [];

    pages.forEach((page: any, pageIndex: number) => {
      if (page.Texts) {
        page.Texts.forEach((textItem: any, itemIndex: number) => {
          const y = textItem.y;
          const text = decodeURIComponent(textItem.R?.[0]?.T || '');
          allTextItems.push({ page: pageIndex, order: itemIndex, y, text });
        });
      }
    });

    // Sort by page first, then by ORIGINAL ORDER (NOT Y coordinate)
    // This preserves pdf2json's reading order which is correct
    allTextItems.sort((a, b) => {
      if (a.page !== b.page) {
        return a.page - b.page;
      }
      return a.order - b.order;
    });

    // Build lines by grouping consecutive text items with similar Y
    const lines: string[] = [];
    let currentLine: string[] = [];
    let lastY = -999;
    const Y_THRESHOLD = 0.5;

    allTextItems.forEach(item => {
      if (Math.abs(item.y - lastY) > Y_THRESHOLD && currentLine.length > 0) {
        lines.push(currentLine.join(' | '));
        currentLine = [];
      }
      
      if (item.text.trim().length > 0) {
        currentLine.push(item.text);
        lastY = item.y;
      }
    });
    
    if (currentLine.length > 0) {
      lines.push(currentLine.join(' | '));
    }

    return lines;
  }

  /**
   * Parse the PDF data structure from pdf2json
   * IMPORTANT: Preserve original order for items at same Y coordinate
   */
  private parseTranscriptData(pdfData: any): ParsedTranscript {
    // Extract text from all pages, preserving original order within each page
    const allTextItems: Array<{ page: number; order: number; y: number; text: string }> = [];
    const pages = pdfData.Pages || [];

    pages.forEach((page: any, pageIndex: number) => {
      if (page.Texts) {
        page.Texts.forEach((textItem: any, itemIndex: number) => {
          const y = textItem.y;
          const text = decodeURIComponent(textItem.R?.[0]?.T || '');
          allTextItems.push({ page: pageIndex, order: itemIndex, y, text });
        });
      }
    });

    // Sort by page first, then by Y coordinate (top to bottom)
    // Lower Y values (including negative) come first
    allTextItems.sort((a, b) => {
      if (a.page !== b.page) {
        return a.page - b.page;
      }
      // Within same page, sort by Y coordinate
      // This puts negative Y (course tables) before positive Y (footers/headers)
      if (Math.abs(a.y - b.y) > 0.1) {
        return a.y - b.y;
      }
      // If same Y, preserve original order
      return a.order - b.order;
    });

    // Build lines by grouping consecutive text items, using pipe separator
    // Group items that are very close in Y coordinate
    const lines: string[] = [];
    let currentLine: string[] = [];
    let lastY = -999;
    const Y_THRESHOLD = 0.5; // Group items within 0.5 units of Y

    allTextItems.forEach(item => {
      // If Y coordinate changes significantly, start a new line
      if (Math.abs(item.y - lastY) > Y_THRESHOLD && currentLine.length > 0) {
        lines.push(currentLine.join(' | '));
        currentLine = [];
      }
      
      if (item.text.trim().length > 0) {
        currentLine.push(item.text);
        lastY = item.y;
      }
    });
    
    // Add the last line
    if (currentLine.length > 0) {
      lines.push(currentLine.join(' | '));
    }

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
   * Extract terms using hybrid approach:
   * - Term boundaries from pdf-parse (correct order  with line indices)
   * - Course data from pdf2json (structured columns)
   */
  private extractTermsHybrid(
    termBoundaries: Array<{ term: string; year: string; lineIndex: number; gpa?: number }>,
    structuredLines: string[]
  ): TranscriptTerm[] {
    const terms: TranscriptTerm[] = [];
    
    // Extract ALL courses from structured lines once
    const allCourses: TranscriptCourse[] = [];
    structuredLines.forEach(line => {
      const courses = this.extractCoursesFromLine(line);
      allCourses.push(...courses);
    });
    
    console.log(`\nDEBUG: Found ${allCourses.length} total courses from pdf2json`);
    console.log(`DEBUG: Found ${termBoundaries.length} terms from pdf-parse`);
    
    // Simple approach: divide courses evenly based on term count
    // This assumes courses appear in same order in both sources
    const coursesPerTerm = Math.floor(allCourses.length / termBoundaries.length);
    const remainder = allCourses.length % termBoundaries.length;
    
    let courseIndex = 0;
    termBoundaries.forEach((boundary, index) => {
      const term: TranscriptTerm = {
        term: boundary.term,
        year: boundary.year,
        courses: [],
        termGPA: boundary.gpa,
        termCredits: undefined
      };
      
      // Assign courses - give each term roughly equal number
      // Last term gets any remaining courses
      let numCoursesForTerm = coursesPerTerm;
      if (index < remainder) {
        numCoursesForTerm++; // Distribute remainder across first terms
      }
      
      for (let i = 0; i < numCoursesForTerm && courseIndex < allCourses.length; i++) {
        const course = allCourses[courseIndex];
        course.term = term.term;
        course.year = term.year;
        term.courses.push(course);
        courseIndex++;
      }
      
      terms.push(term);
    });
    
    return this.cleanupTerms(terms);
  }

  /**
   * Extract terms and courses using a GPA-based approach
   * Key insight: Term GPA marks the END of each term
   */
  private extractTerms(lines: string[]): TranscriptTerm[] {
    // Find the course section
    let courseSecStart = -1;
    let courseSecEnd = lines.length;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('Beginning of Undergraduate Record')) {
        courseSecStart = i + 1;
      }
      if (lines[i].includes('End of Student Record')) {
        courseSecEnd = i;
        break;
      }
    }

    if (courseSecStart === -1) {
      return [];
    }

    // First pass: find all term headers and their GPAs
    const termInfo: Array<{ index: number; term: string; year: string; gpaIndex?: number; gpa?: number }> = [];
    
    for (let i = courseSecStart; i < courseSecEnd; i++) {
      const line = lines[i];
      
      // Find term headers
      const termMatch = line.match(/^(Winter|Summer|Fall|Spring|Fall\/Winter|Winter\/Summer)\s+(\d{4}(?:-\d{2})?)$/);
      if (termMatch) {
        termInfo.push({
          index: i,
          term: termMatch[1],
          year: termMatch[2]
        });
      }
      
      // Find Term GPA and associate with the most recent term
      if (line.startsWith('Term GPA') && termInfo.length > 0) {
        const gpaMatch = line.match(/Term GPA\s+(\d+\.?\d*)/);
        if (gpaMatch) {
          const lastTerm = termInfo[termInfo.length - 1];
          lastTerm.gpaIndex = i;
          lastTerm.gpa = parseFloat(gpaMatch[1]);
        }
      }
    }

    // Second pass: extract courses for each term
    // Courses belong to a term if they appear BETWEEN:
    // - The term header and its Term GPA line (if it has one)
    // - OR the term header and the next term header (if no GPA)
    const terms: TranscriptTerm[] = [];
    
    termInfo.forEach((termData, index) => {
      const term: TranscriptTerm = {
        term: termData.term,
        year: termData.year,
        courses: [],
        termGPA: termData.gpa,
        termCredits: undefined
      };

      // Define the range for course extraction
      const startIndex = termData.index + 1;
      let endIndex: number;
      
      if (termData.gpaIndex) {
        // If this term has a GPA, courses are between header and GPA
        endIndex = termData.gpaIndex;
      } else {
        // If no GPA, courses extend until the next term header or end of section
        const nextTerm = termInfo[index + 1];
        endIndex = nextTerm ? nextTerm.index : courseSecEnd;
      }

      // Extract courses from lines in this range
      for (let i = startIndex; i < endIndex; i++) {
        const courses = this.extractCoursesFromLine(lines[i]);
        courses.forEach(course => {
          course.term = term.term;
          course.year = term.year;
          term.courses.push(course);
        });
      }

      terms.push(term);
    });

    return this.cleanupTerms(terms);
  }

  /**
   * Clean up terms - remove empty terms and fix term assignments
   */
  private cleanupTerms(terms: TranscriptTerm[]): TranscriptTerm[] {
    // Remove empty terms
    const nonEmptyTerms = terms.filter(term => term.courses.length > 0);
    
    // Sort terms by year and term order
    const termOrder = { 'Winter': 1, 'Spring': 2, 'Summer': 3, 'Fall': 4 };
    nonEmptyTerms.sort((a, b) => {
      const yearDiff = parseInt(a.year) - parseInt(b.year);
      if (yearDiff !== 0) return yearDiff;
      return (termOrder[a.term as keyof typeof termOrder] || 0) - (termOrder[b.term as keyof typeof termOrder] || 0);
    });

    return nonEmptyTerms;
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
    let grade = parts[titleIndex].toUpperCase();
    
    // Handle future courses - if grade is "0.00" or empty, keep as is (future courses)
    // Don't change the grade, just keep it as "0.00" for future courses
    titleIndex++;

    let gpa: number | undefined;
    let classAvg: number | undefined;
    let classSize: number | undefined;
    let programCredits: number | undefined;
    let other: string | undefined;

    // For letter grades (not PASS, EX, 0.00, etc.), we have GPA, AVG, SIZE, EARNED
    if (grade !== 'PASS' && grade !== 'EX' && grade !== '0.00' && grade !== '0' && grade !== '0.0') {
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
    } else if (grade === '0.00' || grade === '0' || grade === '0.0') {
      // For future courses (0.00 grade), don't try to parse GPA/class info
      // Just skip to the end
      while (titleIndex < parts.length && !['WKRT', 'RPT', 'EX'].includes(parts[titleIndex])) {
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
      term: '',
      year: '',
      other
    };
  }
}

export default TranscriptParser;

