"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscriptParser = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const pdf2json_1 = __importDefault(require("pdf2json"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const node_timers_1 = require("node:timers");
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
class TranscriptParser {
    /**
     * Parse a transcript from a PDF file path
     */
    async parseFromFile(filePath) {
        try {
            const dataBuffer = node_fs_1.default.readFileSync(filePath);
            return await this.parseFromBuffer(dataBuffer);
        }
        catch (error) {
            throw new Error(`Failed to read transcript file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Parse a transcript from a Buffer
     * Uses BOTH pdf-parse (for term detection) and pdf2json (for structured course data)
     */
    async parseFromBuffer(buffer) {
        try {
            // Step 1: Use pdf-parse to get clean text with correct reading order
            const pdfParseData = await (0, pdf_parse_1.default)(buffer);
            const cleanText = pdfParseData.text;
            // Step 2: Use pdf2json to get structured data with columns
            const pdf2jsonData = await new Promise((resolve, reject) => {
                const pdfParser = new pdf2json_1.default(null, 1);
                pdfParser.on('pdfParser_dataError', (errData) => {
                    reject(new Error(`PDF parsing error: ${errData.parserError}`));
                });
                pdfParser.on('pdfParser_dataReady', (pdfData) => {
                    resolve(pdfData);
                });
                // pdf2json expects a file path, so we need to write temp file
                const tempPath = node_path_1.default.join('/tmp', `transcript_${Date.now()}.pdf`);
                node_fs_1.default.writeFileSync(tempPath, buffer);
                pdfParser.loadPDF(tempPath);
                // Clean up temp file after a delay
                (0, node_timers_1.setTimeout)(() => {
                    try {
                        node_fs_1.default.unlinkSync(tempPath);
                    }
                    catch (e) {
                        console.error(e);
                        // Ignore cleanup errors
                    }
                }, 5000);
            });
            // Step 3: Parse using both sources
            return this.parseTranscriptDataHybrid(cleanText, pdf2jsonData);
        }
        catch (error) {
            throw new Error(`Failed to parse transcript: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Hybrid parsing method using both pdf-parse and pdf2json
     */
    parseTranscriptDataHybrid(cleanText, pdf2jsonData) {
        // Use pdf2json to get structured course data
        const structuredLines = this.extractStructuredLines(pdf2jsonData);
        // Try pdf-parse first for term boundaries
        const pdfParseLines = cleanText.split('\n');
        let termBoundaries = this.findTermBoundariesFromText(pdfParseLines);
        // If pdf-parse didn't find many terms, try extracting from structured lines
        // (This happens when PDF has all text at same Y coordinate)
        if (termBoundaries.length < 5) {
            const structuredTermBoundaries = this.findTermBoundariesFromText(structuredLines);
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
    findTermBoundariesFromText(lines) {
        const termBoundaries = [];
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
            if (!inCourseSection)
                continue;
            // Match term headers (only actual course terms, not admit term)
            const termRegex = /^(Winter|Summer|Fall|Spring|Fall\/Winter|Winter\/Summer)\s+(\d{4}(?:-\d{2})?)$/;
            const termMatch = termRegex.exec(line);
            if (termMatch) {
                termBoundaries.push({
                    term: termMatch[1],
                    year: termMatch[2],
                    lineIndex: i,
                });
            }
            // Match Term GPA and associate with last term
            if (line.startsWith('Term GPA') && termBoundaries.length > 0) {
                const gpaRegex = /Term GPA\s+(\d+\.?\d*)/;
                const gpaMatch = gpaRegex.exec(line);
                if (gpaMatch) {
                    termBoundaries.at(-1).gpa = Number.parseFloat(gpaMatch[1]);
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
    extractStructuredLines(pdfData) {
        // Extract text from all pages in ORIGINAL ORDER
        const allTextItems = [];
        const pages = pdfData.Pages || [];
        for (const [pageIndex, page] of pages.entries()) {
            if (page.Texts) {
                for (const [itemIndex, textItem] of page.Texts.entries()) {
                    const y = textItem.y;
                    const text = decodeURIComponent(textItem.R?.[0]?.T || '');
                    allTextItems.push({ page: pageIndex, order: itemIndex, y, text });
                }
            }
        }
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
        const lines = [];
        let currentLine = [];
        let lastY = -999;
        let lastPage = -1;
        const Y_THRESHOLD = 0.5;
        for (const item of allTextItems) {
            // Break line on page change OR significant Y change
            const shouldBreakLine = (Math.abs(item.y - lastY) > Y_THRESHOLD || item.page !== lastPage) &&
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
        }
        if (currentLine.length > 0) {
            lines.push(currentLine.join(' | '));
        }
        return lines;
    }
    /**
     * Extract student information
     */
    extractStudentInfo(lines) {
        const studentInfo = {};
        const expandedLines = this.expandPipeSeparatedLines(lines.slice(0, 50));
        for (let i = 0; i < expandedLines.length; i++) {
            const line = expandedLines[i];
            if (!line || line.length < 2)
                continue;
            this.trySetStudentName(studentInfo, expandedLines, i);
            this.trySetStudentId(studentInfo, line);
            this.trySetAddress(studentInfo, expandedLines, i);
            this.trySetCityProvince(studentInfo, line);
            this.trySetCountryPostal(studentInfo, line);
            this.trySetBirthdate(studentInfo, line);
            this.trySetPermanentCode(studentInfo, line);
            this.trySetTelephone(studentInfo, line);
        }
        return studentInfo;
    }
    expandPipeSeparatedLines(lines) {
        return lines.flatMap((line) => line.includes(' | ') ? line.split(' | ').map((l) => l.trim()) : [line]);
    }
    trySetStudentName(info, lines, i) {
        const line = lines[i];
        if (i < lines.length - 1 &&
            lines[i + 1].startsWith(TranscriptParser.STUDENT_ID_STRING) &&
            !line.includes('http') &&
            !line.includes('Page') &&
            !line.includes('Student Record') &&
            line.length > 5 &&
            line.length < 100) {
            info.studentName = line;
        }
    }
    trySetStudentId(info, line) {
        if (line.startsWith(TranscriptParser.STUDENT_ID_STRING)) {
            const idMatch = /Student ID:\s*(\d+)/.exec(line);
            if (idMatch)
                info.studentId = idMatch[1];
        }
    }
    trySetAddress(info, lines, i) {
        const line = lines[i];
        if (i > 0 &&
            lines[i - 1].startsWith(TranscriptParser.STUDENT_ID_STRING) &&
            !line.includes(',') &&
            !line.includes('Canada') &&
            !line.startsWith('Birthdate') &&
            !line.startsWith('Student')) {
            info.address = line;
        }
    }
    trySetCityProvince(info, line) {
        if ((line.includes(', QC') ||
            line.includes(', ON') ||
            line.includes(', BC')) &&
            !line.includes('Canada') &&
            !line.includes('|') &&
            line.length < 100) {
            const parts = line.split(',').map((p) => p.trim());
            if (parts.length >= 2) {
                info.city = parts[0];
                info.province = parts[1];
            }
        }
    }
    trySetCountryPostal(info, line) {
        if (line.startsWith('Canada')) {
            info.country = 'Canada';
            const postalRegex = /([A-Z]\d[A-Z]\s?\d[A-Z]\d)/;
            const postalMatch = postalRegex.exec(line);
            if (postalMatch)
                info.postalCode = postalMatch[1];
        }
    }
    trySetBirthdate(info, line) {
        if (line.startsWith('Birthdate:')) {
            const birthdateRegex = /Birthdate:\s*(.+)/;
            const match = birthdateRegex.exec(line);
            if (match)
                info.birthdate = match[1].trim();
        }
    }
    trySetPermanentCode(info, line) {
        if (line.startsWith('Permanent Code:')) {
            const codeRegex = /Permanent Code:\s*(.+)/;
            const match = codeRegex.exec(line);
            if (match)
                info.permanentCode = match[1].trim();
        }
    }
    trySetTelephone(info, line) {
        if (line.startsWith('Telephone:')) {
            const phoneRegex = /Telephone:\s*(.+)/;
            const match = phoneRegex.exec(line);
            if (match)
                info.telephone = match[1].trim();
        }
    }
    /**
     * Extract program history
     */
    extractProgramHistory(lines) {
        const expandedLines = this.expandPipeSeparatedLines(lines);
        const programs = [];
        for (let i = 0; i < expandedLines.length; i++) {
            if (expandedLines[i] === TranscriptParser.ACTIVE_STRING) {
                const date = i + 1 < expandedLines.length ? expandedLines[i + 1] : '';
                const details = this.extractProgramDetails(expandedLines, i + 2);
                programs.push({
                    status: TranscriptParser.ACTIVE_STRING,
                    startDate: date,
                    admitTerm: details.admitTerm,
                    degreeType: details.degreeType,
                    major: details.major,
                    note: details.note,
                });
            }
        }
        return programs;
    }
    extractProgramDetails(lines, startIdx) {
        let degreeType = '';
        let major = '';
        let note = '';
        let admitTerm = '';
        for (let j = startIdx; j < Math.min(startIdx + 8, lines.length); j++) {
            const line = lines[j];
            if (line.includes('Bachelor of') || line.includes('Master of')) {
                degreeType = line;
            }
            else if (line.includes('Engineering') &&
                !line.includes('Bachelor') &&
                !degreeType.includes(line)) {
                major = line;
            }
            else if (line.includes('Admit Term')) {
                admitTerm = j + 1 < lines.length ? lines[j + 1] : '';
            }
            else if (line.includes('Matriculated') ||
                line.includes('Member Institute') ||
                line.includes('Concentration Change')) {
                note = line;
            }
            else if (line === TranscriptParser.ACTIVE_STRING ||
                line.includes('Min. Credits Required')) {
                break;
            }
        }
        return { degreeType, major, note, admitTerm };
    }
    /**
     * Extract transfer credits from prior institutions
     */
    extractTransferCredits(lines) {
        return lines
            .filter(this.isTransferCreditHeader)
            .flatMap(this.extractTransferCreditsFromLine);
    }
    isTransferCreditHeader(line) {
        return line.includes(' | ') && line.includes('YEAR ATTENDED');
    }
    extractTransferCreditsFromLine(line) {
        const parts = line.split(' | ').map((p) => p.trim());
        const transferCredits = [];
        for (let i = 0; i < parts.length - 5; i++) {
            const [dept, number, description, grade, year, creditsStr] = parts.slice(i, i + 6);
            if (/^[A-Z]{2,4}$/.test(dept) &&
                /^\d{3}$/.test(number) &&
                (grade === 'EX' || grade === 'PASS') &&
                /^\d+(?:\.\d+)?$/.test(creditsStr)) {
                transferCredits.push({
                    courseCode: `${dept} ${number}`,
                    courseTitle: description,
                    grade: grade,
                    yearAttended: year === 'NA' ? undefined : year,
                    programCreditsEarned: Number.parseFloat(creditsStr),
                });
            }
        }
        return transferCredits;
    }
    /**
     * Extract academic summary
     */
    extractAcademicSummary(lines) {
        const info = {};
        const expandedLines = this.expandPipeSeparatedLines(lines);
        for (let i = 0; i < expandedLines.length; i++) {
            this.trySetNumericField(info, expandedLines, i, 'Min. Credits Required:', 'minCreditsRequired');
            this.trySetNumericField(info, expandedLines, i, 'Program Credits Earned:', 'programCreditsEarned');
            this.trySetNumericField(info, expandedLines, i, 'Cumulative GPA:', 'overallGPA');
            this.trySetWritingSkillsRequirement(info, expandedLines[i]);
        }
        return info;
    }
    trySetNumericField(info, lines, i, label, field) {
        if (lines[i] === label && i + 1 < lines.length) {
            const nextLine = lines[i + 1].trim();
            const value = Number.parseFloat(nextLine);
            if (!Number.isNaN(value)) {
                info[field] = value;
            }
        }
    }
    trySetWritingSkillsRequirement(info, line) {
        if (line.startsWith('Writing Skills Requirement:')) {
            const reqRegex = /Writing Skills Requirement:\s*(.+)/;
            const reqMatch = reqRegex.exec(line);
            if (reqMatch)
                info.writingSkillsRequirement = reqMatch[1].trim();
        }
    }
    /**
     * Extract terms using hybrid approach:
     * - Term boundaries from pdf-parse (correct order with line indices)
     * - Course data from pdf2json (structured columns with order preservation)
     */
    extractTermsHybrid(termBoundaries, pdf2jsonData) {
        const allCourses = this.flattenCoursesByPage(this.extractCoursesFromPdf2json(pdf2jsonData));
        let courseIndex = 0;
        const terms = [];
        for (const [termIdx, boundary] of termBoundaries.entries()) {
            const term = {
                term: boundary.term,
                year: boundary.year,
                courses: [],
                termGPA: boundary.gpa,
                termCredits: undefined,
            };
            courseIndex = this.assignCoursesToTerm(allCourses, courseIndex, term, termIdx, termBoundaries.length);
            terms.push(term);
        }
        return this.cleanupTerms(terms);
    }
    flattenCoursesByPage(coursesByPage) {
        const allCourses = [];
        for (const [page, coursesOnPage] of coursesByPage) {
            for (const courseInfo of coursesOnPage) {
                allCourses.push({
                    ...courseInfo.course,
                    page,
                    order: courseInfo.order,
                });
            }
        }
        return allCourses;
    }
    assignCoursesToTerm(allCourses, startIdx, term, termIdx, totalTerms) {
        let courseIndex = startIdx;
        while (courseIndex < allCourses.length) {
            const currentCourse = allCourses[courseIndex];
            const { page, order, ...cleanCourse } = currentCourse;
            cleanCourse.term = term.term;
            cleanCourse.year = term.year;
            term.courses.push(cleanCourse);
            courseIndex++;
            const nextCourse = courseIndex < allCourses.length ? allCourses[courseIndex] : null;
            if (!nextCourse)
                break;
            const samePage = currentCourse.page === nextCourse.page;
            const gap = nextCourse.order - currentCourse.order;
            const isTermBoundary = (samePage && gap >= 20) || !samePage;
            if (isTermBoundary && termIdx < totalTerms - 1)
                break;
        }
        return courseIndex;
    }
    /**
     * Extract courses directly from pdf2json data, preserving page and order information
     */
    extractCoursesFromPdf2json(pdf2jsonData) {
        const coursesByPage = new Map();
        const pages = pdf2jsonData.Pages || [];
        for (const [pageIdx, page] of pages.entries()) {
            const coursesOnPage = [];
            const texts = page.Texts || [];
            // Iterate through texts to find course patterns
            for (let i = 0; i < texts.length - 2; i++) {
                const item = texts[i];
                const next1 = texts[i + 1];
                const next2 = texts[i + 2];
                const itemText = decodeURIComponent(item.R?.[0]?.T || '').trim();
                const next1Text = decodeURIComponent(next1.R?.[0]?.T || '').trim();
                const next2Text = decodeURIComponent(next2.R?.[0]?.T || '').trim();
                // Only look at items with negative Y (course data section)
                if (item.y < 0 &&
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
                    /^[A-Z0-9]{1,3}$/.test(next2Text)) {
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
        }
        return coursesByPage;
    }
    /**
     * Parse a course from pdf2json raw data starting at the given index
     */
    parseCoursePdf2jsonData(texts, startIndex) {
        if (startIndex + 5 >= texts.length)
            return null;
        const dept = this.decodeText(texts, startIndex);
        const number = this.decodeText(texts, startIndex + 1);
        const section = this.decodeText(texts, startIndex + 2).trim();
        const courseCode = `${dept} ${number}`;
        const { title, nextIndex } = this.collectCourseTitle(texts, startIndex + 3);
        let titleIndex = nextIndex;
        if (!this.isCreditsField(texts, titleIndex))
            return null;
        const credits = Number.parseFloat(this.decodeText(texts, titleIndex));
        titleIndex++;
        if (titleIndex >= texts.length)
            return null;
        const grade = this.decodeText(texts, titleIndex).toUpperCase();
        titleIndex++;
        let gpa, classAvg, classSize, other;
        if (!this.isSpecialGrade(grade)) {
            ({ gpa, classAvg, classSize, titleIndex } = this.parseLetterGradeFields(texts, titleIndex));
        }
        else if (this.isZeroGrade(grade)) {
            titleIndex = this.skipToOtherField(texts, titleIndex);
        }
        else {
            ({ titleIndex } = this.parsePassExemptedCredits(texts, titleIndex));
        }
        other = this.parseOtherField(texts, titleIndex);
        return {
            courseCode,
            section,
            courseTitle: title,
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
    decodeText(texts, idx) {
        return decodeURIComponent(texts[idx]?.R?.[0]?.T || '');
    }
    collectCourseTitle(texts, idx) {
        let title = '';
        let count = 0;
        while (idx < texts.length &&
            !/^\d+\.\d{2}$/.test(this.decodeText(texts, idx))) {
            title += this.decodeText(texts, idx) + ' ';
            idx++;
            count++;
            if (count > 15)
                break;
        }
        return { title: title.trim(), nextIndex: idx };
    }
    isCreditsField(texts, idx) {
        return (idx < texts.length && /^\d+\.\d{2}$/.test(this.decodeText(texts, idx)));
    }
    isSpecialGrade(grade) {
        return ['PASS', 'EX', '0.00', '0', '0.0'].includes(grade);
    }
    isZeroGrade(grade) {
        return ['0.00', '0', '0.0'].includes(grade);
    }
    parseLetterGradeFields(texts, idx) {
        let gpa, classAvg, classSize, programCredits;
        if (this.isCreditsField(texts, idx)) {
            gpa = Number.parseFloat(this.decodeText(texts, idx));
            idx++;
        }
        if (this.isCreditsField(texts, idx)) {
            classAvg = Number.parseFloat(this.decodeText(texts, idx));
            idx++;
        }
        if (idx < texts.length && /^\d{1,4}$/.test(this.decodeText(texts, idx))) {
            classSize = Number.parseInt(this.decodeText(texts, idx));
            idx++;
        }
        if (this.isCreditsField(texts, idx)) {
            programCredits = Number.parseFloat(this.decodeText(texts, idx));
            idx++;
        }
        return { gpa, classAvg, classSize, programCredits, titleIndex: idx };
    }
    skipToOtherField(texts, idx) {
        while (idx < texts.length &&
            !['WKRT', 'RPT', 'EX'].includes(this.decodeText(texts, idx))) {
            idx++;
        }
        return idx;
    }
    parsePassExemptedCredits(texts, idx) {
        while (idx < texts.length &&
            !/^\d+\.\d{2}$/.test(this.decodeText(texts, idx))) {
            idx++;
        }
        let programCredits;
        if (idx < texts.length) {
            programCredits = Number.parseFloat(this.decodeText(texts, idx));
            idx++;
        }
        return { programCredits, titleIndex: idx };
    }
    parseOtherField(texts, idx) {
        if (idx < texts.length &&
            ['WKRT', 'RPT', 'EX'].includes(this.decodeText(texts, idx))) {
            return this.decodeText(texts, idx);
        }
        return undefined;
    }
    /**
     * Clean up terms - remove empty terms and fix term assignments
     */
    cleanupTerms(terms) {
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
            const yearDiff = Number.parseInt(a.year) - Number.parseInt(b.year);
            if (yearDiff !== 0)
                return yearDiff;
            return ((termOrder[a.term] || 0) -
                (termOrder[b.term] || 0));
        });
        return nonEmptyTerms;
    }
}
exports.TranscriptParser = TranscriptParser;
TranscriptParser.STUDENT_ID_STRING = 'Student ID:';
TranscriptParser.ACTIVE_STRING = 'Active in Program';
exports.default = TranscriptParser;
//# sourceMappingURL=transcriptParser.js.map