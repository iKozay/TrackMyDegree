import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, PDFForm } from 'pdf-lib';

const FORM_TEMPLATE_FILENAME = 'SEQUENCE CHANGE REQUEST FORM.pdf';
const FORM_TEMPLATE_PATH = path.resolve(
  __dirname,
  '../../public',
  FORM_TEMPLATE_FILENAME,
);
const SEASONS: Array<'fall' | 'winter' | 'summer'> = ['fall', 'winter', 'summer'];
const MAX_FORM_SEMESTERS = 15;
const MAX_COURSES_PER_SEMESTER = 5;

interface CachedCourse {
  code?: string;
}

interface CachedSemester {
  term?: string;
  courses?: CachedCourse[];
}

interface TimelineCourseInfo {
  id?: string;
  credits?: number | string;
}

interface TimelineForCoopForm {
  semesters?: CachedSemester[];
  courses?: Record<string, TimelineCourseInfo>;
}

export interface CoopFormBuildResult {
  pdfBytes: Uint8Array;
  notes: string[];
}

function normalizeCourseKey(courseCode: string): string {
  return courseCode.toUpperCase().replaceAll(/[^A-Z0-9]/g, '');
}

function formatCourseCode(rawCode: string): string {
  const upper = rawCode.trim().toUpperCase();
  if (!upper) return '';

  const cwtPattern = /^(CWTE|CWTC|CWT)\s*(\d{3})$/;
  const cwtMatch = cwtPattern.exec(upper);
  if (cwtMatch) {
    return `CWT ${cwtMatch[2]}`;
  }

  const spaced = upper.replace(/^([A-Z]+)\s*(\d{3,4}[A-Z]?)$/, '$1 $2');
  return spaced;
}

function extractYear(term?: string): string {
  if (!term) return '';
  const yearPattern = /\b(19|20)\d{2}\b/;
  const match = yearPattern.exec(term);
  return match ? match[0] : '';
}

function getTermOffset(term?: string): number {
  const upper = (term ?? '').toUpperCase();
  if (upper.includes('FALL')) return 0;
  if (upper.includes('WINTER')) return 1;
  if (upper.includes('SUMMER')) return 2;
  return 0;
}

function resolveFormTemplatePath(): string | null {
  return fs.existsSync(FORM_TEMPLATE_PATH) ? FORM_TEMPLATE_PATH : null;
}

/**
 * The timeline may contain a synthetic "FALL/WINTER YYYY-YYYY+1" semester
 * created when a capstone (XXX 490) appears in both a Fall and the following
 * Winter term.  The PDF form has no such column — it only has discrete Fall,
 * Winter, and Summer slots filled sequentially.  Leaving the extra
 * FALL/WINTER entry in the list offsets every subsequent column by one.
 *
 * This function folds any FALL/WINTER semester's courses back into both the
 * immediately preceding semester (the Fall slot) and the immediately following
 * semester (the Winter slot), then removes the FALL/WINTER entry so the form
 * slot count stays correct.
 */
function normalizeSemestersForForm(semesters: CachedSemester[]): CachedSemester[] {
  const result: CachedSemester[] = [];
  const pendingMerge: CachedCourse[] = [];

  for (const semester of semesters) {
    if ((semester.term ?? '').toUpperCase().startsWith('FALL/WINTER')) {
      // Fold into preceding semester (already appended to result)
      const extra = semester.courses ?? [];
      if (extra.length > 0 && result.length > 0) {
        const prev = result[result.length - 1];
        result[result.length - 1] = { ...prev, courses: [...(prev.courses ?? []), ...extra] };
      }
      // Remember courses so we can also merge them into the next semester
      pendingMerge.push(...(semester.courses ?? []));
    } else if (pendingMerge.length > 0) {
      // First non-FALL/WINTER semester after a fold — add pending courses here too
      result.push({ ...semester, courses: [...(semester.courses ?? []), ...pendingMerge] });
      pendingMerge.length = 0;
    } else {
      result.push(semester);
    }
  }

  return result;
}

function setTextFieldIfExists(form: PDFForm, fieldName: string, value: string): void {
  if (!value) return;

  try {
    form.getTextField(fieldName).setText(value);
  } catch {
    // Field may not exist in this template revision. Ignore safely.
  }
}

function getCourseCredits(
  courseCode: string,
  timelineCourses?: Record<string, TimelineCourseInfo>,
): string {
  if (!timelineCourses) return '';

  const normalizedTarget = normalizeCourseKey(courseCode);

  for (const [key, course] of Object.entries(timelineCourses)) {
    const keyMatches = normalizeCourseKey(key) === normalizedTarget;
    const idMatches =
      typeof course.id === 'string' &&
      normalizeCourseKey(course.id) === normalizedTarget;

    if (!keyMatches && !idMatches) {
      continue;
    }

    const credits = course.credits;
    if (typeof credits === 'number' && Number.isFinite(credits)) {
      return String(credits);
    }

    if (typeof credits === 'string' && credits.trim().length > 0) {
      return credits.trim();
    }

    return '';
  }

  return '';
}

function fillSemesterIntoForm(
  form: PDFForm,
  semester: CachedSemester,
  slotIndex: number,
  timelineCourses: Record<string, TimelineCourseInfo> | undefined,
  notes: string[],
): void {
  const yearNumber = Math.floor(slotIndex / 3) + 1;
  const season = SEASONS[slotIndex % 3];
  const yearFieldName = `year_${yearNumber}_${season}`;

  setTextFieldIfExists(form, yearFieldName, extractYear(semester.term));

  const formSemesterIndex = slotIndex + 1;
  const fieldSuffix = formSemesterIndex === 1 ? '' : `_${formSemesterIndex}`;

  const semesterCourses = Array.isArray(semester.courses) ? semester.courses : [];

  if (semesterCourses.length > MAX_COURSES_PER_SEMESTER) {
    const termLabel = semester.term ?? `Semester ${formSemesterIndex}`;
    notes.push(
      `${termLabel} has more than ${MAX_COURSES_PER_SEMESTER} courses. Courses beyond the first ${MAX_COURSES_PER_SEMESTER} were skipped on the form.`,
    );
  }

  for (let courseIndex = 0; courseIndex < Math.min(semesterCourses.length, MAX_COURSES_PER_SEMESTER); courseIndex += 1) {
    const rawCode = semesterCourses[courseIndex]?.code ?? '';
    const formattedCode = formatCourseCode(rawCode);

    if (!formattedCode) continue;

    const courseFieldName = `${courseIndex + 1}${fieldSuffix}`;
    const creditFieldName = `${courseIndex + 1}${fieldSuffix}_cred`;

    setTextFieldIfExists(form, courseFieldName, formattedCode);
    setTextFieldIfExists(
      form,
      creditFieldName,
      getCourseCredits(formattedCode, timelineCourses),
    );
  }
}

export async function buildFilledCoopSequenceForm(
  timeline: unknown,
): Promise<CoopFormBuildResult> {
  const templatePath = resolveFormTemplatePath();
  if (!templatePath) {
    throw new Error('Co-op sequence form template not found in Back-End/src/public.');
  }

  const templateBytes = await fs.promises.readFile(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();

  const notes: string[] = [];
  const safeTimeline = (timeline ?? {}) as TimelineForCoopForm;
  // Fold any synthetic FALL/WINTER semesters back into adjacent Fall/Winter
  // slots before sequential slot-filling so the form columns stay aligned.
  const semesters = normalizeSemestersForForm(
    Array.isArray(safeTimeline.semesters) ? safeTimeline.semesters : [],
  );

  if (semesters.length > 0) {
    const startOffset = getTermOffset(semesters[0]?.term);

    if (startOffset + semesters.length > MAX_FORM_SEMESTERS) {
      notes.push(
        `This timeline exceeds the form capacity of ${MAX_FORM_SEMESTERS} semester slots after initial term alignment. Extra semesters were skipped.`,
      );
    }

    for (let semesterIndex = 0; semesterIndex < semesters.length; semesterIndex += 1) {
      const slotIndex = startOffset + semesterIndex;
      if (slotIndex >= MAX_FORM_SEMESTERS) break;

      fillSemesterIntoForm(
        form,
        semesters[semesterIndex],
        slotIndex,
        safeTimeline.courses,
        notes,
      );
    }
  }

  const pdfBytes = await pdfDoc.save();
  return {
    pdfBytes,
    notes,
  };
}
