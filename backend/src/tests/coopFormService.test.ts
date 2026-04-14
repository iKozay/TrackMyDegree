import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { buildFilledCoopSequenceForm } from '../services/coop/coopFormService';

const FORM_FILENAME = 'SEQUENCE CHANGE REQUEST FORM.pdf';

function getFieldText(form: ReturnType<PDFDocument['getForm']>, fieldName: string): string {
  return form.getTextField(fieldName).getText() ?? '';
}

async function createTemplateBytes(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([600, 800]);
  const form = doc.getForm();

  const fieldNames = [
    'year_1_fall',
    'year_1_winter',
    'year_1_summer',
    'year_2_fall',
    // Fall slot (slot index 0, formSemesterIndex 1 → no suffix)
    '1', '2', '3', '4', '5',
    '1_cred', '2_cred', '3_cred', '4_cred', '5_cred',
    '1_2',
    '2_2',
    '3_2',
    '4_2',
    '5_2',
    '1_2_cred',
    '2_2_cred',
    '3_2_cred',
    '4_2_cred',
    '5_2_cred',
    '1_3',
    '1_3_cred',
    '1_15',
  ];

  let y = 760;
  for (const name of fieldNames) {
    const field = form.createTextField(name);
    field.addToPage(page, {
      x: 20,
      y,
      width: 200,
      height: 18,
    });
    y -= 22;
  }

  return doc.save();
}

describe('buildFilledCoopSequenceForm', () => {
  const templatePath = path.resolve(
    __dirname,
    '../public',
    FORM_FILENAME,
  );

  let templateBytes: Uint8Array;

  beforeAll(async () => {
    templateBytes = await createTemplateBytes();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fills years/courses/credits with winter start and records >5 courses note', async () => {
    jest.spyOn(fs, 'existsSync').mockImplementation((candidate: fs.PathLike) => {
      return String(candidate) === templatePath;
    });

    jest
      .spyOn(fs.promises, 'readFile')
      .mockResolvedValue(Buffer.from(templateBytes));

    const timeline = {
      semesters: [
        {
          term: 'Winter 2025',
          courses: [
            { code: 'COMP232' },
            { code: 'CWTE100' },
            { code: 'MATH204' },
            { code: 'SOEN287' },
            { code: 'ELEC275' },
            { code: 'EXTRA999' },
          ],
        },
        {
          term: 'Summer 2025',
          courses: [{ code: 'COMP248' }],
        },
      ],
      courses: {
        'COMP 232': { id: 'COMP 232', credits: 3 },
        'CWT 100': { id: 'CWT 100', credits: 3 },
        'MATH 204': { id: 'MATH 204', credits: 3 },
        'SOEN 287': { id: 'SOEN 287', credits: 3 },
        'ELEC 275': { id: 'ELEC 275', credits: 3 },
        'COMP 248': { id: 'COMP 248', credits: 3 },
      },
    };

    const result = await buildFilledCoopSequenceForm(timeline);

    expect(result.notes).toHaveLength(1);
    expect(result.notes[0]).toContain('more than 5 courses');

    const filledDoc = await PDFDocument.load(result.pdfBytes);
    const form = filledDoc.getForm();

    expect(getFieldText(form, 'year_1_winter')).toBe('2025');
    expect(getFieldText(form, 'year_1_summer')).toBe('2025');

    // First semester starts at winter => slot 2 fields (_2)
    expect(getFieldText(form, '1_2')).toBe('COMP 232');
    expect(getFieldText(form, '1_2_cred')).toBe('3');
    expect(getFieldText(form, '2_2')).toBe('CWT 100');
    expect(getFieldText(form, '2_2_cred')).toBe('3');

    // Summer semester maps to slot 3 (_3)
    expect(getFieldText(form, '1_3')).toBe('COMP 248');
    expect(getFieldText(form, '1_3_cred')).toBe('3');
  });

  it('adds overflow note and skips semesters that exceed 15-slot capacity', async () => {
    jest.spyOn(fs, 'existsSync').mockImplementation((candidate: fs.PathLike) => {
      return String(candidate) === templatePath;
    });

    jest
      .spyOn(fs.promises, 'readFile')
      .mockResolvedValue(Buffer.from(templateBytes));

    const semesters = Array.from({ length: 15 }, (_, index) => ({
      term: `Winter ${2025 + Math.floor(index / 3)}`,
      courses: [{ code: `COMP${200 + index}` }],
    }));

    const courses = Object.fromEntries(
      semesters.map((semester, index) => [
        `COMP ${200 + index}`,
        { id: `COMP ${200 + index}`, credits: 3 },
      ]),
    );

    const result = await buildFilledCoopSequenceForm({ semesters, courses });

    expect(result.notes.some((note) => note.includes('exceeds the form capacity'))).toBe(true);

    const filledDoc = await PDFDocument.load(result.pdfBytes);
    const form = filledDoc.getForm();

    // Semester index 13 still fits in slot 15; index 14 is skipped.
    expect(getFieldText(form, '1_15')).toBe('COMP 213');
  });

  it('throws when the template PDF cannot be found', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);

    await expect(buildFilledCoopSequenceForm({ semesters: [] })).rejects.toThrow(
      'Co-op sequence form template not found in backend/src/public.',
    );
  });

  it('supports summer start and leaves credit blank when course credits are missing', async () => {
    jest.spyOn(fs, 'existsSync').mockImplementation((candidate: fs.PathLike) => {
      return String(candidate) === templatePath;
    });

    jest
      .spyOn(fs.promises, 'readFile')
      .mockResolvedValue(Buffer.from(templateBytes));

    const timeline = {
      semesters: [
        {
          term: 'Summer 2026',
          courses: [{ code: 'COMP249' }],
        },
      ],
      courses: {
        'COMP 249': { id: 'COMP 249' },
      },
    };

    const result = await buildFilledCoopSequenceForm(timeline);
    const filledDoc = await PDFDocument.load(result.pdfBytes);
    const form = filledDoc.getForm();

    expect(getFieldText(form, 'year_1_summer')).toBe('2026');
    expect(getFieldText(form, '1_3')).toBe('COMP 249');
    expect(getFieldText(form, '1_3_cred')).toBe('');
  });

  it('folds FALL/WINTER capstone semester into adjacent Fall and Winter form slots', async () => {
    jest.spyOn(fs, 'existsSync').mockImplementation((candidate: fs.PathLike) => {
      return String(candidate) === templatePath;
    });

    jest
      .spyOn(fs.promises, 'readFile')
      .mockResolvedValue(Buffer.from(templateBytes));

    // Simulate what semesterBuilder emits after the capstone merge:
    // FALL and WINTER each lose their 490 entry; a new FALL/WINTER semester
    // is inserted between them.
    const timeline = {
      semesters: [
        {
          term: 'FALL 2024',
          courses: [{ code: 'ENGR301' }, { code: 'SOEN321' }],
        },
        {
          term: 'FALL/WINTER 2024-2025',
          courses: [{ code: 'SOEN490' }],
        },
        {
          term: 'WINTER 2025',
          courses: [{ code: 'ENGR392' }, { code: 'ENGR391' }],
        },
      ],
      courses: {
        'SOEN 490': { id: 'SOEN 490', credits: 6 },
        'ENGR 301': { id: 'ENGR 301', credits: 3 },
        'SOEN 321': { id: 'SOEN 321', credits: 3 },
        'ENGR 392': { id: 'ENGR 392', credits: 3 },
        'ENGR 391': { id: 'ENGR 391', credits: 3 },
      },
    };

    const result = await buildFilledCoopSequenceForm(timeline);
    expect(result.notes).toHaveLength(0);

    const filledDoc = await PDFDocument.load(result.pdfBytes);
    const form = filledDoc.getForm();

    // Year labels
    expect(getFieldText(form, 'year_1_fall')).toBe('2024');
    expect(getFieldText(form, 'year_1_winter')).toBe('2025');

    // Fall slot (no suffix): ENGR 301, SOEN 321, then SOEN 490 folded in
    expect(getFieldText(form, '1')).toBe('ENGR 301');
    expect(getFieldText(form, '2')).toBe('SOEN 321');
    expect(getFieldText(form, '3')).toBe('SOEN 490');
    expect(getFieldText(form, '3_cred')).toBe('6');

    // Winter slot (_2): ENGR 392, ENGR 391, then SOEN 490 folded in
    expect(getFieldText(form, '1_2')).toBe('ENGR 392');
    expect(getFieldText(form, '2_2')).toBe('ENGR 391');
    expect(getFieldText(form, '3_2')).toBe('SOEN 490');
    expect(getFieldText(form, '3_2_cred')).toBe('6');
  });

  it('handles unknown term labels and courses map miss without failing', async () => {
    jest.spyOn(fs, 'existsSync').mockImplementation((candidate: fs.PathLike) => {
      return String(candidate) === templatePath;
    });

    jest
      .spyOn(fs.promises, 'readFile')
      .mockResolvedValue(Buffer.from(templateBytes));

    const timeline = {
      semesters: [
        {
          term: 'UnknownTerm 2030',
          courses: [{ code: 'UNKN100' }],
        },
      ],
      courses: {
        'COMP 232': { id: 'COMP 232', credits: 3 },
      },
    };

    const result = await buildFilledCoopSequenceForm(timeline);
    const filledDoc = await PDFDocument.load(result.pdfBytes);
    const form = filledDoc.getForm();

    // Unknown term defaults to fall slot (first semester fields).
    expect(getFieldText(form, 'year_1_fall')).toBe('2030');
  });
});
