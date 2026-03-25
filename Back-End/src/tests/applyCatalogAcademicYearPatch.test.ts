import fs from 'node:fs/promises';
import mongoose from 'mongoose';
import { Course, CoursePool, Degree, EntityVersionDiff } from '@models';
import {
  applyDiffsForAcademicYear,
  applyPatchFile,
  assertResolvedReferences,
  collectReferencedIds,
  ensurePatchShape,
  getDiffId,
  getMongoUri,
  groupDiffsByAcademicYear,
  loadCatalogState,
  loadKnownEntityIds,
  main,
  normalizeBaseCoursePools,
  normalizeBaseCourses,
  normalizeBaseDegrees,
  normalizeDiffs,
  parseArgs,
  readPatchFile,
  validateBaseEntityReferences,
  validateDiffTarget,
  validateReferences,
} from '../scripts/applyCatalogAcademicYearPatch';
import * as applyCatalogAcademicYearPatchModule from '../scripts/applyCatalogAcademicYearPatch';

jest.mock('node:fs/promises');
jest.mock('mongoose');
jest.mock('@models', () => ({
  Degree: { find: jest.fn(), updateOne: jest.fn() },
  CoursePool: { find: jest.fn(), updateOne: jest.fn() },
  Course: { find: jest.fn(), updateOne: jest.fn() },
  EntityVersionDiff: { updateOne: jest.fn() },
}));

const mockFs = fs as jest.Mocked<typeof fs>;
const mockMongoose = mongoose as jest.Mocked<typeof mongoose>;

describe('applyCatalogAcademicYearPatch script', () => {
  const originalArgv = process.argv;
  const originalEnv = process.env;
  const academicYear = '2026-2027';
  const courseDiffId = `Course:C:${academicYear}`;
  const degreeDiffId = `Degree:D:${academicYear}`;

  beforeEach(() => {
    jest.clearAllMocks();
    process.argv = [...originalArgv];
    process.env = { ...originalEnv };
    mockFs.readFile.mockResolvedValue('{}');
    mockMongoose.connect.mockResolvedValue(mockMongoose as never);
    mockMongoose.disconnect.mockResolvedValue(undefined);

    for (const model of [Degree, CoursePool, Course]) {
      (model.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });
      (model.updateOne as jest.Mock).mockResolvedValue({});
    }
    (EntityVersionDiff.updateOne as jest.Mock).mockResolvedValue({});
  });

  afterAll(() => {
    process.argv = originalArgv;
    process.env = originalEnv;
  });

  it('covers argument parsing and normalization helpers', () => {
    expect(parseArgs(['noop'])).toEqual({
      file: undefined,
      apply: false,
      dryRun: true,
    });
    expect(parseArgs(['--file', 'x.json', '--apply'])).toEqual({
      file: 'x.json',
      apply: true,
      dryRun: false,
    });
    delete (process.env as any).MONGODB_URI;
    expect(getMongoUri()).toContain('localhost:27017');
    expect(getDiffId('Course', 'COMP 248', '2026-2027')).toBe(
      'Course:COMP 248:2026-2027',
    );
    expect(() => ensurePatchShape([], 'x')).toThrow('at least one JSON Patch');
    expect(
      normalizeBaseDegrees('2026-2027', [
        { _id: 'D', name: 'D', totalCredits: 1 },
      ])[0].baseAcademicYear,
    ).toBe('2026-2027');
    expect(
      normalizeBaseCoursePools('2026-2027', [
        { _id: 'P', name: 'P', creditsRequired: 1 },
      ])[0].courses,
    ).toEqual([]);
    expect(
      normalizeBaseCourses('2026-2027', [
        { _id: 'C', title: 'C', description: '', credits: 3 },
      ])[0].baseAcademicYear,
    ).toBe('2026-2027');
    expect(String(123)).toBe('123');
  });

  it('reads patch files and validates academicYear presence', async () => {
    mockFs.readFile.mockResolvedValue(
      JSON.stringify({ academicYear: '2026-2027' }),
    );
    await expect(readPatchFile('x.json')).resolves.toEqual({
      academicYear: '2026-2027',
    });

    mockFs.readFile.mockResolvedValue(JSON.stringify({}));
    await expect(readPatchFile('x.json')).rejects.toThrow('academicYear');
  });

  it('collects references and validates explicit errors', () => {
    expect(
      collectReferencedIds({
        degrees: [{ _id: 'D', name: 'D', totalCredits: 1 }],
        coursePools: [{ _id: 'P', name: 'P', creditsRequired: 1 }],
        diffs: [],
      }),
    ).toEqual({
      referencedDegreeIds: new Set(),
      referencedCoursePoolIds: new Set(),
      referencedCourseIds: new Set(),
    });

    expect(
      collectReferencedIds({
        degrees: [{ _id: 'D', name: 'D', totalCredits: 1, coursePools: ['P'] }],
        coursePools: [{ _id: 'P', name: 'P', creditsRequired: 1, courses: ['C'] }],
        diffs: [
          { entityType: 'Course', entityId: 'C' },
          { entityType: 'CoursePool', entityId: 'P2' },
          { entityType: 'Degree', entityId: 'D2' },
        ],
      }),
    ).toEqual({
      referencedDegreeIds: new Set(['D2']),
      referencedCoursePoolIds: new Set(['P', 'P2']),
      referencedCourseIds: new Set(['C']),
    });

    expect(() =>
      validateBaseEntityReferences(
        {
          degrees: [{ _id: 'D', name: 'D', totalCredits: 1, coursePools: ['P'] }],
          coursePools: [],
        },
        {
          knownDegrees: new Set(),
          knownCoursePools: new Set(),
          knownCourses: new Set(),
        },
      ),
    ).toThrow('references unknown course pool');

    expect(() =>
      validateBaseEntityReferences(
        {
          degrees: [],
          coursePools: [
            { _id: 'P', name: 'P', creditsRequired: 1, courses: ['C'] },
          ],
        },
        {
          knownDegrees: new Set(),
          knownCoursePools: new Set(['P']),
          knownCourses: new Set(),
        },
      ),
    ).toThrow('references unknown course');

    expect(() =>
      validateDiffTarget(
        { _id: 'x', entityType: 'Course', entityId: 'C' },
        {
          knownDegrees: new Set(),
          knownCoursePools: new Set(),
          knownCourses: new Set(),
        },
      ),
    ).toThrow('targets unknown course');

    expect(() =>
      validateBaseEntityReferences(
        {
          degrees: [{ _id: 'D', name: 'D', totalCredits: 1 }],
          coursePools: [{ _id: 'P', name: 'P', creditsRequired: 1 }],
        },
        {
          knownDegrees: new Set(['D']),
          knownCoursePools: new Set(['P']),
          knownCourses: new Set(['C']),
        },
      ),
    ).not.toThrow();
  });

  it('normalizes diffs and groups by academic year', () => {
    const diffs = normalizeDiffs(
      'Course',
      academicYear,
      [{ entityId: 'C', patch: [{ op: 'add', path: '/x', value: 1 }] }],
    );

    expect(diffs[0]._id).toContain(courseDiffId);

    const grouped = groupDiffsByAcademicYear(diffs as any);
    expect(grouped.get(academicYear)).toHaveLength(1);
  });

  it('loads known ids and catalog state', async () => {
    (Degree.find as jest.Mock).mockReturnValueOnce({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([{ _id: 'D' }]),
    });
    (CoursePool.find as jest.Mock).mockReturnValueOnce({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([{ _id: 'P' }]),
    });
    (Course.find as jest.Mock).mockReturnValueOnce({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([{ _id: 'C' }]),
    });

    const knownIds = await loadKnownEntityIds({
      degrees: [],
      coursePools: [],
      courses: [],
      diffs: [],
    });
    expect(knownIds.knownDegrees.has('D')).toBe(true);

    (Degree.find as jest.Mock).mockReturnValueOnce({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([{ _id: 'D', coursePools: [] }]),
    });
    (CoursePool.find as jest.Mock).mockReturnValueOnce({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([{ _id: 'P', courses: [] }]),
    });
    (Course.find as jest.Mock).mockReturnValueOnce({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([{ _id: 'C' }]),
    });

    const state = await loadCatalogState(knownIds, {
      degrees: [],
      coursePools: [],
      courses: [],
    });
    expect(state.degreeState.has('D')).toBe(true);
  });

  it('applies diffs and validates resolved references', () => {
    const state = {
      degreeState: new Map([['D', { _id: 'D', name: 'D', totalCredits: 1, coursePools: ['P'] }]]),
      coursePoolState: new Map([['P', { _id: 'P', name: 'P', creditsRequired: 1, courses: ['C'] }]]),
      courseState: new Map([['C', { _id: 'C', title: 'C', description: '', credits: 3 }]]),
    };

    applyDiffsForAcademicYear(state as any, [
      {
        _id: degreeDiffId,
        entityType: 'Degree',
        entityId: 'D',
        academicYear,
        academicYearStart: 2026,
        patch: [{ op: 'replace', path: '/name', value: 'Updated Degree' }],
      },
      {
        _id: 'CoursePool:P:2026-2027',
        entityType: 'CoursePool',
        entityId: 'P',
        academicYear: '2026-2027',
        academicYearStart: 2026,
        patch: [{ op: 'replace', path: '/creditsRequired', value: 2 }],
      },
      {
        _id: 'Course:C:2026-2027',
        entityType: 'Course',
        entityId: 'C',
        academicYear: '2026-2027',
        academicYearStart: 2026,
        patch: [{ op: 'add', path: '/notes', value: 'note' }],
      },
    ]);

    expect((state.degreeState.get('D') as any)?.name).toBe('Updated Degree');
    expect((state.coursePoolState.get('P') as any)?.creditsRequired).toBe(2);
    expect((state.courseState.get('C') as any)?.notes).toBe('note');
    expect(() => assertResolvedReferences(state as any, '2026-2027')).not.toThrow();

    state.courseState.clear();
    expect(() => assertResolvedReferences(state as any, '2026-2027')).toThrow(
      'references missing course',
    );

    const missingPoolState = {
      degreeState: new Map([
        ['D', { _id: 'D', name: 'D', totalCredits: 1, coursePools: ['P'] }],
      ]),
      coursePoolState: new Map(),
      courseState: new Map(),
    };

    expect(() =>
      assertResolvedReferences(missingPoolState as any, '2026-2027'),
    ).toThrow('references missing course pool');

    expect(() =>
      assertResolvedReferences(
        {
          degreeState: new Map([['D', { _id: 'D', name: 'D', totalCredits: 1 }]]),
          coursePoolState: new Map([['P', { _id: 'P', name: 'P', creditsRequired: 1 }]]),
          courseState: new Map([['C', { _id: 'C', title: 'C', description: '', credits: 3 }]]),
        } as any,
        '2026-2027',
      ),
    ).not.toThrow();
  });

  it('throws when diffs target missing state entries', () => {
    expect(() =>
      applyDiffsForAcademicYear(
        {
          degreeState: new Map(),
          coursePoolState: new Map(),
          courseState: new Map(),
        } as any,
        [
          {
            _id: 'Degree:D:2026-2027',
            entityType: 'Degree',
            entityId: 'D',
            academicYear: '2026-2027',
            academicYearStart: 2026,
            patch: [{ op: 'add', path: '/name', value: 'D' }],
          },
        ] as any,
      ),
    ).toThrow('Missing degree state');

    expect(() =>
      applyDiffsForAcademicYear(
        {
          degreeState: new Map(),
          coursePoolState: new Map(),
          courseState: new Map(),
        } as any,
        [
          {
            _id: 'CoursePool:P:2026-2027',
            entityType: 'CoursePool',
            entityId: 'P',
            academicYear: '2026-2027',
            academicYearStart: 2026,
            patch: [{ op: 'add', path: '/name', value: 'P' }],
          },
        ] as any,
      ),
    ).toThrow('Missing course pool state');

    expect(() =>
      applyDiffsForAcademicYear(
        {
          degreeState: new Map(),
          coursePoolState: new Map(),
          courseState: new Map(),
        } as any,
        [
          {
            _id: 'Course:C:2026-2027',
            entityType: 'Course',
            entityId: 'C',
            academicYear: '2026-2027',
            academicYearStart: 2026,
            patch: [{ op: 'add', path: '/notes', value: 'x' }],
          },
        ] as any,
      ),
    ).toThrow('Missing course state');
  });

  it('validates references across diff sequence', async () => {
    await expect(
      validateReferences({
        degrees: [{ _id: 'D', name: 'D', totalCredits: 1, coursePools: ['P'] }],
        coursePools: [{ _id: 'P', name: 'P', creditsRequired: 1, courses: ['C'] }],
        courses: [{ _id: 'C', title: 'C', description: '', credits: 3 }],
        diffs: [
          {
            _id: 'Degree:D:2027-2028',
            entityType: 'Degree',
            entityId: 'D',
            academicYear: '2027-2028',
            academicYearStart: 2027,
            patch: [{ op: 'replace', path: '/coursePools', value: ['P'] }],
          },
        ],
      }),
    ).resolves.toBeUndefined();
  });

  it('validates references when there are no diffs to replay', async () => {
    await expect(
      validateReferences({
        degrees: [{ _id: 'D', name: 'D', totalCredits: 1 }],
        coursePools: [{ _id: 'P', name: 'P', creditsRequired: 1 }],
        courses: [{ _id: 'C', title: 'C', description: '', credits: 3 }],
        diffs: [],
      }),
    ).resolves.toBeUndefined();
  });

  it('uses the empty-diff fallback while validating references', async () => {
    const groupSpy = jest
      .spyOn(applyCatalogAcademicYearPatchModule, 'groupDiffsByAcademicYear')
      .mockReturnValue(new Map([['2026-2027', undefined as any]]));

    await expect(
      validateReferences({
        degrees: [{ _id: 'D', name: 'D', totalCredits: 1 }],
        coursePools: [{ _id: 'P', name: 'P', creditsRequired: 1 }],
        courses: [{ _id: 'C', title: 'C', description: '', credits: 3 }],
        diffs: [
          {
            _id: 'Degree:D:2026-2027',
            entityType: 'Degree',
            entityId: 'D',
            academicYear: '2026-2027',
            academicYearStart: 2026,
            patch: [{ op: 'replace', path: '/name', value: 'D' }],
          },
        ] as any,
      }),
    ).resolves.toBeUndefined();

    groupSpy.mockRestore();
  });

  it('applies patch file in dry-run and apply modes', async () => {
    const patchFile = {
      academicYear: '2026-2027',
      baseEntities: {
        degrees: [{ _id: 'D', name: 'D', totalCredits: 1 }],
        coursePools: [{ _id: 'P', name: 'P', creditsRequired: 1 }],
        courses: [{ _id: 'C', title: 'C', description: '', credits: 3 }],
      },
      diffs: {
        degrees: [],
        coursePools: [],
        courses: [{ entityId: 'C', patch: [{ op: 'add', path: '/notes', value: 'x' }] }],
      },
    };

    await expect(applyPatchFile(patchFile as any, false)).resolves.toEqual({
      upsertedDegrees: 1,
      upsertedCoursePools: 1,
      upsertedCourses: 1,
      upsertedDiffs: 1,
    });

    await applyPatchFile(patchFile as any, true);
    expect(Degree.updateOne).toHaveBeenCalled();
    expect(CoursePool.updateOne).toHaveBeenCalled();
    expect(Course.updateOne).toHaveBeenCalled();
    expect(EntityVersionDiff.updateOne).toHaveBeenCalled();
  });

  it('falls back to the default academic year when none is provided', async () => {
    await expect(
      applyPatchFile(
        {
          academicYear: '',
        } as any,
        false,
      ),
    ).resolves.toEqual({
      upsertedDegrees: 0,
      upsertedCoursePools: 0,
      upsertedCourses: 0,
      upsertedDiffs: 0,
    });
  });

  it('prints usage when file is missing and runs main on success', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    process.argv = ['node', 'apply.ts'];
    process.exitCode = 0;
    await main();
    expect(process.exitCode).toBe(1);

    mockFs.readFile.mockResolvedValue(JSON.stringify({ academicYear: '2026-2027' }));
    process.argv = ['node', 'apply.ts', '--file', 'x.json'];
    await main();

    expect(mockMongoose.connect).toHaveBeenCalled();
    expect(mockMongoose.disconnect).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalled();

    mockFs.readFile.mockResolvedValue(JSON.stringify({ academicYear: '2026-2027' }));
    process.argv = ['node', 'apply.ts', '--file', 'x.json', '--apply'];
    await main();
    expect(logSpy).toHaveBeenLastCalledWith(
      expect.stringContaining('"mode": "apply"'),
    );

    logSpy.mockRestore();
  });
});
