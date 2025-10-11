import fs from 'fs';
import path from 'path';
import PDFParser from 'pdf2json';
import pdfParse from 'pdf-parse';
import type {
  AdditionalInfo,
  ParsedTranscript,
  ProgramInfo,
  StudentInfo,
  TranscriptCourse,
  TranscriptTerm,
  TransferCredit,
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
  /**
   * Parse a transcript from a PDF file path
   */
  async parseFromFile(filePath: string): Promise<ParsedTranscript> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      return await this.parseFromBuffer(dataBuffer);
    } catch (error) {
      throw new Error(
        `Failed to read transcript file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
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
      return this.parseTranscriptDataHybrid(cleanText, pdf2jsonData);
    } catch (error) {
      throw new Error(
        `Failed to parse transcript: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Hybrid parsing method using both pdf-parse and pdf2json
   */
  private parseTranscriptDataHybrid(
    cleanText: string,
    pdf2jsonData: any,
  ): ParsedTranscript {
    // Use pdf2json to get structured course data
    const structuredLines = this.extractStructuredLines(pdf2jsonData);

    // Try pdf-parse first for term boundaries
    const pdfParseLines = cleanText.split('\n');
    let termBoundaries = this.findTermBoundariesFromText(pdfParseLines);

    // If pdf-parse didn't find many terms, try extracting from structured lines
    // (This happens when PDF has all text at same Y coordinate)
    if (termBoundaries.length < 5) {
      const structuredTermBoundaries =
        this.findTermBoundariesFromText(structuredLines);
      if (structuredTermBoundaries.length > termBoundaries.length) {
        termBoundaries = structuredTermBoundaries;
      }
    }

    // Build student info and metadata from structured lines
    const studentInfo = this.extractStudentInfo(structuredLines);
    const programHistory = this.extractProgramHistory(structuredLines);
    const additionalInfo = this.extractAcademicSummary(structuredLines);
    const transferCredits = this.extractTransferCredits(structuredLines);

    // Extract courses using term boundaries and structure from pdf2json
    const terms = this.extractTermsHybrid(termBoundaries, pdf2jsonData);

    return {
      studentInfo,
      programHistory,
      transferCredits,
      terms,
      additionalInfo,
    };
  }

  /**
   * Find term boundaries from pdf-parse text (correct reading order)
   * NOTE: This only extracts actual course terms, not the admit term from program history
   */
  private findTermBoundariesFromText(
    lines: string[],
  ): Array<{ term: string; year: string; lineIndex: number; gpa?: number }> {
    const termBoundaries: Array<{
      term: string;
      year: string;
      lineIndex: number;
      gpa?: number;
    }> = [];
    let inCourseSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Course section starts after "Beginning of Undergraduate Record"
      // This ensures we skip the program history section (which contains admit term)
      if (line.includes('Beginning of Undergraduate Record')) {
        inCourseSection = true;
        continue;
      }

      if (line.includes('End of Student Record')) {
        break;
      }

      if (!inCourseSection) continue;

      // Match term headers (only actual course terms, not admit term)
      const termMatch = line.match(
        /^(Winter|Summer|Fall|Spring|Fall\/Winter|Winter\/Summer)\s+(\d{4}(?:-\d{2})?)$/,
      );
      if (termMatch) {
        termBoundaries.push({
          term: termMatch[1],
          year: termMatch[2],
          lineIndex: i,
        });
      }

      // Match Term GPA and associate with last term
      if (line.startsWith('Term GPA') && termBoundaries.length > 0) {
        const gpaMatch = line.match(/Term GPA\s+(\d+\.?\d*)/);
        if (gpaMatch) {
          termBoundaries[termBoundaries.length - 1].gpa = parseFloat(
            gpaMatch[1],
          );
        }
      }
    }

    return termBoundaries;
  }

  /**
   * Extract structured lines from pdf2json (with column separation)
   * CRITICAL: Use ORIGINAL pdf2json order, NOT Y-sorted!
   * ALSO: Respect page boundaries - don't join text across pages
   */
  private extractStructuredLines(pdfData: any): string[] {
    // Extract text from all pages in ORIGINAL ORDER
    const allTextItems: Array<{
      page: number;
      order: number;
      y: number;
      text: string;
    }> = [];
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
    // IMPORTANT: Also break on page boundaries
    const lines: string[] = [];
    let currentLine: string[] = [];
    let lastY = -999;
    let lastPage = -1;
    const Y_THRESHOLD = 0.5;

    allTextItems.forEach((item) => {
      // Break line on page change OR significant Y change
      const shouldBreakLine =
        (Math.abs(item.y - lastY) > Y_THRESHOLD || item.page !== lastPage) &&
        currentLine.length > 0;

      if (shouldBreakLine) {
        lines.push(currentLine.join(' | '));
        currentLine = [];
      }

      if (item.text.trim().length > 0) {
        currentLine.push(item.text);
        lastY = item.y;
        lastPage = item.page;
      }
    });

    if (currentLine.length > 0) {
      lines.push(currentLine.join(' | '));
    }

    return lines;
  }

  /**
   * Extract student information
   */
  private extractStudentInfo(lines: string[]): StudentInfo {
    const studentInfo: StudentInfo = {};

    // Handle case where lines are pipe-separated (all text has same Y coordinate)
    // Split each line by " | " to get individual fields
    const expandedLines: string[] = [];
    for (const line of lines.slice(0, 50)) {
      if (line.includes(' | ')) {
        // If line contains pipes, split it ONLY (don't include the original)
        expandedLines.push(...line.split(' | ').map((l) => l.trim()));
      } else {
        expandedLines.push(line);
      }
    }

    for (let i = 0; i < expandedLines.length; i++) {
      const line = expandedLines[i];

      // Skip empty lines and lines that are too short
      if (!line || line.length < 2) continue;

      // Extract student name (line before Student ID)
      if (
        i < expandedLines.length - 1 &&
        expandedLines[i + 1].startsWith('Student ID:') &&
        !line.includes('http') &&
        !line.includes('Page') &&
        !line.includes('Student Record') &&
        line.length > 5 &&
        line.length < 100
      ) {
        studentInfo.studentName = line;
      }

      if (line.startsWith('Student ID:')) {
        const idMatch = line.match(/Student ID:\s*(\d+)/);
        if (idMatch) studentInfo.studentId = idMatch[1];
      }

      // Address is the line after Student ID
      if (
        i > 0 &&
        expandedLines[i - 1].startsWith('Student ID:') &&
        !line.includes(',') &&
        !line.includes('Canada') &&
        !line.startsWith('Birthdate') &&
        !line.startsWith('Student')
      ) {
        studentInfo.address = line;
      }

      // City and province (e.g., "Saint-Laurent, QC")
      // Only match if it's a short line (not a concatenated mess)
      if (
        (line.includes(', QC') ||
          line.includes(', ON') ||
          line.includes(', BC')) &&
        !line.includes('Canada') &&
        !line.includes('|') &&
        line.length < 100
      ) {
        const parts = line.split(',').map((p) => p.trim());
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

    // Handle case where lines are pipe-separated
    const expandedLines: string[] = [];
    for (const line of lines) {
      if (line.includes(' | ')) {
        expandedLines.push(...line.split(' | ').map((l) => l.trim()));
      } else {
        expandedLines.push(line);
      }
    }

    for (let i = 0; i < expandedLines.length; i++) {
      const line = expandedLines[i];

      if (line === 'Active in Program') {
        const date = i + 1 < expandedLines.length ? expandedLines[i + 1] : '';
        let degreeType = '';
        let major = '';
        let note = '';
        let admitTerm = '';

        for (let j = i + 2; j < Math.min(i + 10, expandedLines.length); j++) {
          if (
            expandedLines[j].includes('Bachelor of') ||
            expandedLines[j].includes('Master of')
          ) {
            degreeType = expandedLines[j];
          } else if (
            expandedLines[j].includes('Engineering') &&
            !expandedLines[j].includes('Bachelor') &&
            !degreeType.includes(expandedLines[j])
          ) {
            major = expandedLines[j];
          } else if (expandedLines[j].includes('Admit Term')) {
            admitTerm =
              j + 1 < expandedLines.length ? expandedLines[j + 1] : '';
          } else if (
            expandedLines[j].includes('Matriculated') ||
            expandedLines[j].includes('Member Institute') ||
            expandedLines[j].includes('Concentration Change')
          ) {
            note = expandedLines[j];
          } else if (
            expandedLines[j] === 'Active in Program' ||
            expandedLines[j].includes('Min. Credits Required')
          ) {
            break;
          }
        }

        programs.push({
          status: 'Active in Program',
          startDate: date,
          admitTerm,
          degreeType,
          major,
          note,
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

      const parts = line.split(' | ').map((p) => p.trim());

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
          if (
            /^[A-Z]{2,4}$/.test(dept) &&
            /^\d{3}$/.test(number) &&
            (grade === 'EX' || grade === 'PASS') &&
            /^\d+\.?\d*$/.test(credits)
          ) {
            transferCredits.push({
              courseCode: `${dept} ${number}`,
              courseTitle: description,
              grade: grade,
              yearAttended: year !== 'NA' ? year : undefined,
              programCreditsEarned: parseFloat(credits),
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

    // Handle case where lines are pipe-separated
    const expandedLines: string[] = [];
    for (const line of lines) {
      if (line.includes(' | ')) {
        expandedLines.push(...line.split(' | ').map((l) => l.trim()));
      } else {
        expandedLines.push(line);
      }
    }

    for (let i = 0; i < expandedLines.length; i++) {
      const line = expandedLines[i];

      if (line === 'Min. Credits Required:' && i + 1 < expandedLines.length) {
        const nextLine = expandedLines[i + 1].trim();
        if (/^\d+\.?\d*$/.test(nextLine)) {
          info.minCreditsRequired = parseFloat(nextLine);
        }
      }

      if (line === 'Program Credits Earned:' && i + 1 < expandedLines.length) {
        const nextLine = expandedLines[i + 1].trim();
        if (/^\d+\.?\d*$/.test(nextLine)) {
          info.programCreditsEarned = parseFloat(nextLine);
        }
      }

      if (line === 'Cumulative GPA:' && i + 1 < expandedLines.length) {
        const nextLine = expandedLines[i + 1].trim();
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
   * - Term boundaries from pdf-parse (correct order with line indices)
   * - Course data from pdf2json (structured columns with order preservation)
   */
  private extractTermsHybrid(
    termBoundaries: Array<{
      term: string;
      year: string;
      lineIndex: number;
      gpa?: number;
    }>,
    pdf2jsonData: any,
  ): TranscriptTerm[] {
    const terms: TranscriptTerm[] = [];

    // Extract courses from pdf2json data preserving page and order
    const coursesByPage = this.extractCoursesFromPdf2json(pdf2jsonData);

    // Flatten all courses with their metadata
    const allCourses: Array<
      TranscriptCourse & { page: number; order: number }
    > = [];
    coursesByPage.forEach((coursesOnPage, page) => {
      coursesOnPage.forEach((courseInfo) => {
        allCourses.push({
          ...courseInfo.course,
          page,
          order: courseInfo.order,
        });
      });
    });

    // Assign courses to terms based on gaps and page changes
    // Key insight: A term boundary occurs AFTER a course when there's a large gap (>20) or page change to the NEXT course
    let courseIndex = 0;
    termBoundaries.forEach((boundary, termIdx) => {
      const term: TranscriptTerm = {
        term: boundary.term,
        year: boundary.year,
        courses: [],
        termGPA: boundary.gpa,
        termCredits: undefined,
      };

      // Collect courses for this term
      while (courseIndex < allCourses.length) {
        const currentCourse = allCourses[courseIndex];

        // Add current course to this term
        const { page, order, ...cleanCourse } = currentCourse;
        cleanCourse.term = term.term;
        cleanCourse.year = term.year;
        term.courses.push(cleanCourse);

        courseIndex++;

        // Check if there's a boundary AFTER this course (before the next one)
        const nextCourse =
          courseIndex < allCourses.length ? allCourses[courseIndex] : null;

        if (!nextCourse) {
          // No more courses, we're done
          break;
        }

        // Check for term boundary indicators
        const samePage = currentCourse.page === nextCourse.page;
        const gap = nextCourse.order - currentCourse.order;

        // A large gap (>=20) on the same page OR a page change indicates a term boundary
        const isTermBoundary = (samePage && gap >= 20) || !samePage;

        if (isTermBoundary && termIdx < termBoundaries.length - 1) {
          // There's a boundary after this course, move to next term
          break;
        }
      }

      terms.push(term);
    });

    return this.cleanupTerms(terms);
  }

  /**
   * Extract courses directly from pdf2json data, preserving page and order information
   */
  private extractCoursesFromPdf2json(
    pdf2jsonData: any,
  ): Map<number, Array<{ course: TranscriptCourse; order: number }>> {
    const coursesByPage = new Map<
      number,
      Array<{ course: TranscriptCourse; order: number }>
    >();

    const pages = pdf2jsonData.Pages || [];

    pages.forEach((page: any, pageIdx: number) => {
      const coursesOnPage: Array<{ course: TranscriptCourse; order: number }> =
        [];
      const texts = page.Texts || [];

      // Iterate through texts to find course patterns
      for (let i = 0; i < texts.length - 2; i++) {
        const item = texts[i];
        const next1 = texts[i + 1];
        const next2 = texts[i + 2];

        const itemText = decodeURIComponent(item.R?.[0]?.T || '');
        const next1Text = decodeURIComponent(next1.R?.[0]?.T || '');
        const next2Text = decodeURIComponent(next2.R?.[0]?.T || '');

        // Only look at items with negative Y (course data section)
        if (
          item.y < 0 &&
          /^[A-Z]{2,4}$/.test(itemText) &&
          itemText.length <= 4 &&
          ![
            'COURSE',
            'GRADE',
            'GPA',
            'AVG',
            'SIZE',
            'OTHER',
            'NOTATION',
            'CLASS',
            'PROGRAM',
            'EARNED',
            'EX',
            'NA',
          ].includes(itemText) &&
          /^\d{3}$/.test(next1Text) &&
          /^[A-Z0-9]{1,3}$/.test(next2Text)
        ) {
          // Found a course! Now parse its full details
          const course = this.parseCoursePdf2jsonData(texts, i);
          if (course) {
            coursesOnPage.push({ course, order: i });
          }
        }
      }

      if (coursesOnPage.length > 0) {
        coursesByPage.set(pageIdx, coursesOnPage);
      }
    });

    return coursesByPage;
  }

  /**
   * Parse a course from pdf2json raw data starting at the given index
   */
  private parseCoursePdf2jsonData(
    texts: any[],
    startIndex: number,
  ): TranscriptCourse | null {
    if (startIndex + 5 >= texts.length) {
      return null;
    }

    const dept = decodeURIComponent(texts[startIndex].R?.[0]?.T || '');
    const number = decodeURIComponent(texts[startIndex + 1].R?.[0]?.T || '');
    const section = decodeURIComponent(texts[startIndex + 2].R?.[0]?.T || '');
    const courseCode = `${dept} ${number}`;

    // Collect title parts until we hit a credits value (N.NN format)
    let courseTitle = '';
    let titleIndex = startIndex + 3;
    while (
      titleIndex < texts.length &&
      !/^\d+\.\d{2}$/.test(
        decodeURIComponent(texts[titleIndex].R?.[0]?.T || ''),
      )
    ) {
      const part = decodeURIComponent(texts[titleIndex].R?.[0]?.T || '');
      courseTitle += part + ' ';
      titleIndex++;
      // Safety: stop if we've gone too far
      if (titleIndex - startIndex > 15) break;
    }
    courseTitle = courseTitle.trim();

    // Next should be credits
    if (
      titleIndex >= texts.length ||
      !/^\d+\.\d{2}$/.test(
        decodeURIComponent(texts[titleIndex].R?.[0]?.T || ''),
      )
    ) {
      return null;
    }
    const credits = parseFloat(
      decodeURIComponent(texts[titleIndex].R?.[0]?.T || ''),
    );
    titleIndex++;

    // Next should be grade
    if (titleIndex >= texts.length) {
      return null;
    }
    let grade = decodeURIComponent(
      texts[titleIndex].R?.[0]?.T || '',
    ).toUpperCase();
    titleIndex++;

    let gpa: number | undefined;
    let classAvg: number | undefined;
    let classSize: number | undefined;
    let programCredits: number | undefined;
    let other: string | undefined;

    // For letter grades (not PASS, EX, 0.00, etc.), we have GPA, AVG, SIZE, EARNED
    if (
      grade !== 'PASS' &&
      grade !== 'EX' &&
      grade !== '0.00' &&
      grade !== '0' &&
      grade !== '0.0'
    ) {
      // GPA
      if (
        titleIndex < texts.length &&
        /^\d+\.\d{2}$/.test(
          decodeURIComponent(texts[titleIndex].R?.[0]?.T || ''),
        )
      ) {
        gpa = parseFloat(decodeURIComponent(texts[titleIndex].R?.[0]?.T || ''));
        titleIndex++;
      }

      // Class Average
      if (
        titleIndex < texts.length &&
        /^\d+\.\d{2}$/.test(
          decodeURIComponent(texts[titleIndex].R?.[0]?.T || ''),
        )
      ) {
        classAvg = parseFloat(
          decodeURIComponent(texts[titleIndex].R?.[0]?.T || ''),
        );
        titleIndex++;
      }

      // Class Size
      if (
        titleIndex < texts.length &&
        /^\d{1,4}$/.test(decodeURIComponent(texts[titleIndex].R?.[0]?.T || ''))
      ) {
        classSize = parseInt(
          decodeURIComponent(texts[titleIndex].R?.[0]?.T || ''),
        );
        titleIndex++;
      }

      // Program Credits Earned
      if (
        titleIndex < texts.length &&
        /^\d+\.\d{2}$/.test(
          decodeURIComponent(texts[titleIndex].R?.[0]?.T || ''),
        )
      ) {
        programCredits = parseFloat(
          decodeURIComponent(texts[titleIndex].R?.[0]?.T || ''),
        );
        titleIndex++;
      }
    } else if (grade === '0.00' || grade === '0' || grade === '0.0') {
      // For future courses (0.00 grade), skip parsing extra fields
      while (
        titleIndex < texts.length &&
        !['WKRT', 'RPT', 'EX'].includes(
          decodeURIComponent(texts[titleIndex].R?.[0]?.T || ''),
        )
      ) {
        titleIndex++;
      }
    } else {
      // For PASS/EX grades, skip to earned credits
      while (
        titleIndex < texts.length &&
        !/^\d+\.\d{2}$/.test(
          decodeURIComponent(texts[titleIndex].R?.[0]?.T || ''),
        )
      ) {
        titleIndex++;
      }
      if (titleIndex < texts.length) {
        programCredits = parseFloat(
          decodeURIComponent(texts[titleIndex].R?.[0]?.T || ''),
        );
        titleIndex++;
      }
    }

    // Check for OTHER field (WKRT, RPT, etc.)
    if (
      titleIndex < texts.length &&
      ['WKRT', 'RPT', 'EX'].includes(
        decodeURIComponent(texts[titleIndex].R?.[0]?.T || ''),
      )
    ) {
      other = decodeURIComponent(texts[titleIndex].R?.[0]?.T || '');
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
      other,
    };
  }

  /**
   * Clean up terms - remove empty terms and fix term assignments
   */
  private cleanupTerms(terms: TranscriptTerm[]): TranscriptTerm[] {
    // Remove empty terms
    const nonEmptyTerms = terms.filter((term) => term.courses.length > 0);

    // Sort terms by year and term order
    // Fall/Winter spans two semesters, so it comes after Fall but represents the transition to Winter
    const termOrder = {
      Winter: 1,
      Spring: 2,
      Summer: 3,
      Fall: 4,
      'Fall/Winter': 4.5,
    };
    nonEmptyTerms.sort((a, b) => {
      const yearDiff = parseInt(a.year) - parseInt(b.year);
      if (yearDiff !== 0) return yearDiff;
      return (
        (termOrder[a.term as keyof typeof termOrder] || 0) -
        (termOrder[b.term as keyof typeof termOrder] || 0)
      );
    });

    return nonEmptyTerms;
  }
}

export default TranscriptParser;
