import { Course, CoursePool, Degree } from '@models';
import {
  addBaseEntity,
  appendEntityChanges,
  buildCurrentEntityMaps,
  buildJsonPatch,
  compactPatch,
  escapeJsonPointerSegment,
  generatePatchFromSnapshotData,
  normalizeCourse,
  normalizeCoursePool,
  normalizeDegree,
  normalizeRules,
  normalizeSnapshot,
  sameValue,
  sortPatchCollections,
  sortUnique,
  stripVersionMetadata,
} from '../scripts/generateCatalogPatchFromSnapshot';

jest.mock('@models', () => ({
  Degree: { find: jest.fn() },
  CoursePool: { find: jest.fn() },
  Course: { find: jest.fn() },
}));

describe('generateCatalogPatchFromSnapshot script', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Degree.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    });
    (CoursePool.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    });
    (Course.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    });
  });

  it('covers normalization helpers', () => {
    expect(sortUnique(['b', 'a', 'a'])).toEqual(['a', 'b']);
    expect(sortUnique()).toEqual([]);
    expect(normalizeRules({ prereq: [['B', 'A']], min_credits: 1 })).toEqual({
      prereq: [['A', 'B']],
      coreq: [],
      not_taken: [],
      min_credits: 1,
    });
    expect(
      normalizeRules({
        prereq: [['B'], ['A']],
      }).prereq,
    ).toEqual([['A'], ['B']]);
    expect(
      normalizeRules(),
    ).toEqual({
      prereq: [],
      coreq: [],
      not_taken: [],
      min_credits: 0,
    });
    expect(
      normalizeRules({
        coreq: [['COMP 249', 'COMP 248']],
        not_taken: ['MATH 200'],
      }),
    ).toEqual({
      prereq: [],
      coreq: [['COMP 248', 'COMP 249']],
      not_taken: ['MATH 200'],
      min_credits: 0,
    });
    expect(
      normalizeCourse(
        {
          _id: 'COMP',
          title: 'T',
          description: '',
          credits: 3,
          offered_in: ['Winter', 'Fall'],
        },
        '2026-2027',
      ),
    ).toMatchObject({
      offeredIn: ['Fall', 'Winter'],
      baseAcademicYear: '2026-2027',
    });
    expect(
      normalizeCourse(
        {
          _id: 'COMP0',
          title: 'Zero',
          credits: 0,
        } as any,
        '2026-2027',
      ),
    ).toMatchObject({
      description: '',
      credits: 0,
      offeredIn: [],
      prereqCoreqText: '',
      notes: '',
      components: [],
    });
    expect(
      normalizeCoursePool(
        { _id: 'P', name: 'Pool', creditsRequired: 0, courses: ['B', 'A'] },
        '2026-2027',
      ),
    ).toMatchObject({
      creditsRequired: 0,
      courses: ['A', 'B'],
    });
    expect(
      normalizeDegree(
        { _id: 'D', name: 'Degree', totalCredits: 0, coursePools: ['B', 'A'] },
        '2026-2027',
      ),
    ).toMatchObject({
      totalCredits: 0,
      coursePools: ['A', 'B'],
    });
    expect(compactPatch([])).toBeNull();
    expect(stripVersionMetadata({ _id: 'X', baseAcademicYear: '2026-2027' })).toEqual({
      _id: 'X',
    });
    expect(sameValue({ a: 1 }, { a: 1 })).toBe(true);
    expect(escapeJsonPointerSegment('a/b~c')).toBe('a~1b~0c');
  });

  it('builds stable JSON patches', () => {
    expect(
      buildJsonPatch(
        { _id: 'X', title: 'Old', baseAcademicYear: '2025-2026' },
        {
          _id: 'X',
          title: 'New',
          notes: 'note',
          baseAcademicYear: '2026-2027',
        },
      ),
    ).toEqual([
      { op: 'add', path: '/notes', value: 'note' },
      { op: 'replace', path: '/title', value: 'New' },
    ]);

    expect(
      buildJsonPatch(
        {
          _id: 'X',
          title: 'Old',
          notes: 'drop',
          baseAcademicYear: '2025-2026',
        },
        {
          _id: 'X',
          title: 'Old',
          baseAcademicYear: '2026-2027',
        },
      ),
    ).toEqual([{ op: 'remove', path: '/notes' }]);
  });

  it('builds current maps and appends new or changed entities', () => {
    const maps = buildCurrentEntityMaps(
      [{ _id: 'D', name: 'Degree', totalCredits: 120 }],
      [{ _id: 'P', name: 'Pool', creditsRequired: 3 }],
      [{ _id: 'C', title: 'Course', description: '', credits: 3 }],
      '2026-2027',
    );
    expect(maps.currentDegrees.has('D')).toBe(true);

    const baseEntities: Array<{ _id: string; baseAcademicYear?: string }> = [];
    const diffs: Array<{
      entityId: string;
      academicYear: string;
      patch: Array<{ op: 'add'; path: string; value: number }>;
    }> = [];

    appendEntityChanges(
      [{ _id: 'N' }, { _id: 'E' }],
      new Map([['E', { _id: 'E' }]]),
      '2026-2027',
      baseEntities,
      diffs,
      (current, next) => (current._id === next._id ? [{ op: 'add', path: '/x', value: 1 }] : null),
    );

    expect(baseEntities).toEqual([{ _id: 'N', baseAcademicYear: '2026-2027' }]);
    expect(diffs).toHaveLength(1);

    addBaseEntity(baseEntities, { _id: 'M' }, '2026-2027');
    expect(baseEntities[1]).toEqual({ _id: 'M', baseAcademicYear: '2026-2027' });
  });

  it('normalizes snapshots and sorts patch collections', () => {
    const snapshot = normalizeSnapshot({
      academicYear: '2026',
      degrees: [
        {
          degree: { _id: 'B', name: 'B', totalCredits: 120, coursePools: ['P2', 'P1'] },
          coursePools: [{ _id: 'P2', name: 'Pool', creditsRequired: 3 }],
        },
      ],
      courses: [{ _id: 'C', title: 'Course', description: '', credits: 3 }],
    });

    expect(snapshot.academicYear).toBe('2026-2027');

    const patch = {
      academicYear: '2026-2027',
      baseEntities: {
        degrees: [{ _id: 'B' }, { _id: 'A' }],
        coursePools: [{ _id: 'B' }, { _id: 'A' }],
        courses: [{ _id: 'B' }, { _id: 'A' }],
      },
      diffs: {
        degrees: [{ entityId: 'B' }, { entityId: 'A' }],
        coursePools: [{ entityId: 'B' }, { entityId: 'A' }],
        courses: [{ entityId: 'B' }, { entityId: 'A' }],
      },
    } as any;

    sortPatchCollections(patch);
    expect(patch.baseEntities.degrees[0]._id).toBe('A');
    expect(patch.diffs.courses[0].entityId).toBe('A');
  });

  it('generates patch data from snapshot', async () => {
    const patch = await generatePatchFromSnapshotData({
      academicYear: '2026-2027',
      degrees: [
        {
          degree: { _id: 'D', name: 'Degree', totalCredits: 120, coursePools: ['P'] },
          coursePools: [{ _id: 'P', name: 'Pool', creditsRequired: 3, courses: ['C'] }],
        },
      ],
      courses: [{ _id: 'C', title: 'Course', description: '', credits: 3 }],
    } as any);

    expect(patch.baseEntities.degrees).toHaveLength(1);
    expect(patch.baseEntities.coursePools).toHaveLength(1);
    expect(patch.baseEntities.courses).toHaveLength(1);
  });

});
