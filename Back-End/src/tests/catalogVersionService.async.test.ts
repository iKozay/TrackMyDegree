jest.mock('@models', () => ({
  EntityVersionDiff: { find: jest.fn() },
}));

import { EntityVersionDiff } from '@models';
import {
  applyVersionPatch,
  compareAcademicYears,
  getLatestAcademicYear,
  normalizeAcademicYear,
  resolveEntityVersion,
  resolveEntityVersionFromDiffs,
  resolveEntityVersions,
} from '@services/catalogVersionService';

describe('catalogVersionService async helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unsupported academic year formats', () => {
    expect(() => normalizeAcademicYear('twenty-twenty-six')).toThrow(
      'Use YYYY-YYYY or YYYY format',
    );
  });

  it('normalizes short-year formats and rejects non-consecutive ranges', () => {
    expect(normalizeAcademicYear()).toBeUndefined();
    expect(normalizeAcademicYear('2026')).toBe('2026-2027');
    expect(normalizeAcademicYear('2026-27')).toBe('2026-2027');
    expect(normalizeAcademicYear('2026-2027')).toBe('2026-2027');
    expect(() => normalizeAcademicYear('2026-2028')).toThrow(
      'Expected consecutive years',
    );
  });

  it('compares academic years and clones entities when no patch is provided', () => {
    expect(compareAcademicYears('2025-2026', '2026-2027')).toBeLessThan(0);

    const base = { _id: 'COMP 248', nested: { title: 'Intro' } };
    const cloned = applyVersionPatch(base);

    expect(cloned).toEqual(base);
    expect(cloned).not.toBe(base);
    expect(cloned.nested).not.toBe(base.nested);
  });

  it('returns the latest academic year from diffs', () => {
    expect(
      getLatestAcademicYear('2025-2026', [
        {
          entityType: 'Course',
          entityId: 'COMP 248',
          academicYear: '2026-2027',
          patch: [],
        },
        {
          entityType: 'Course',
          entityId: 'COMP 248',
          academicYear: '2027-2028',
          patch: [],
        },
      ] as any),
    ).toBe('2027-2028');

    expect(
      getLatestAcademicYear('2025-2026', [
        {
          entityType: 'Course',
          entityId: 'COMP 248',
          academicYear: '2025-2026',
          patch: [],
        },
      ] as any),
    ).toBe('2025-2026');
  });

  it('sorts same-year diffs by entity id before applying them', () => {
    const resolved = resolveEntityVersionFromDiffs({
      entityType: 'Course',
      entityId: 'COMP 248',
      baseEntity: {
        _id: 'COMP 248',
        title: 'Intro',
        description: '',
        credits: 3,
        offeredIn: [],
        baseAcademicYear: '2025-2026',
      },
      academicYear: '2026-2027',
      diffs: [
        {
          entityType: 'Course',
          entityId: 'ZZZ',
          academicYear: '2026-2027',
          patch: [{ op: 'replace', path: '/title', value: 'second' }],
        },
        {
          entityType: 'Course',
          entityId: 'AAA',
          academicYear: '2026-2027',
          patch: [{ op: 'replace', path: '/title', value: 'first' }],
        },
      ],
    });

    expect(resolved.entity.title).toBe('second');
  });

  it('sorts diffs by academic year before applying them', () => {
    const resolved = resolveEntityVersionFromDiffs({
      entityType: 'Course',
      entityId: 'COMP 248',
      baseEntity: {
        _id: 'COMP 248',
        title: 'Intro',
        description: '',
        credits: 3,
        offeredIn: [],
        baseAcademicYear: '2025-2026',
      },
      academicYear: '2027-2028',
      diffs: [
        {
          entityType: 'Course',
          entityId: 'COMP 248',
          academicYear: '2027-2028',
          patch: [{ op: 'replace', path: '/title', value: 'Second year' }],
        },
        {
          entityType: 'Course',
          entityId: 'COMP 248',
          academicYear: '2026-2027',
          patch: [{ op: 'replace', path: '/title', value: 'First year' }],
        },
      ],
    });

    expect(resolved.entity.title).toBe('Second year');
  });

  it('throws when resolving to a year earlier than the base academic year', () => {
    expect(() =>
      resolveEntityVersionFromDiffs({
        entityType: 'Course',
        entityId: 'COMP 248',
        baseEntity: {
          _id: 'COMP 248',
          title: 'Intro',
          description: '',
          credits: 3,
          offeredIn: [],
          baseAcademicYear: '2026-2027',
        },
        academicYear: '2025-2026',
        diffs: [],
      }),
    ).toThrow('earlier than base academic year');
  });

  it('returns an empty list immediately when there are no entities to resolve', async () => {
    await expect(resolveEntityVersions('Course', [], '2026-2027')).resolves.toEqual(
      [],
    );
    expect(EntityVersionDiff.find).not.toHaveBeenCalled();
  });

  it('resolves a base entity unchanged when no diffs are provided directly', () => {
    const resolved = resolveEntityVersionFromDiffs({
      entityType: 'Course',
      entityId: 'COMP 248',
      baseEntity: {
        _id: 'COMP 248',
        title: 'Intro',
        description: '',
        credits: 3,
        offeredIn: [],
        baseAcademicYear: '2025-2026',
      },
    });

    expect(resolved.entity.title).toBe('Intro');
    expect(resolved.academicYear).toBe('2025-2026');
  });

  it('resolves to the latest known year when no target academic year is provided', () => {
    const resolved = resolveEntityVersionFromDiffs({
      entityType: 'Course',
      entityId: 'COMP 248',
      baseEntity: {
        _id: 'COMP 248',
        title: 'Intro',
        description: '',
        credits: 3,
        offeredIn: [],
      } as any,
      diffs: [
        {
          entityType: 'Course',
          entityId: 'COMP 248',
          academicYear: '2026-2027',
          patch: [{ op: 'replace', path: '/title', value: 'Updated' }],
        },
      ],
    });

    expect(resolved.academicYear).toBe('2026-2027');
    expect(resolved.entity.baseAcademicYear).toBe('2026-2027');
  });

  it('ignores diffs outside the requested academic-year window', () => {
    const resolved = resolveEntityVersionFromDiffs({
      entityType: 'Course',
      entityId: 'COMP 248',
      baseEntity: {
        _id: 'COMP 248',
        title: 'Intro',
        description: '',
        credits: 3,
        offeredIn: [],
        baseAcademicYear: '2025-2026',
      },
      academicYear: '2026-2027',
      diffs: [
        {
          entityType: 'Course',
          entityId: 'COMP 248',
          academicYear: '2024-2025',
          patch: [{ op: 'replace', path: '/title', value: 'Too early' }],
        },
        {
          entityType: 'Course',
          entityId: 'COMP 248',
          academicYear: '2027-2028',
          patch: [{ op: 'replace', path: '/title', value: 'Too late' }],
        },
      ],
    });

    expect(resolved.entity.title).toBe('Intro');
    expect(resolved.academicYear).toBe('2026-2027');
  });

  it('resolves multiple entities from grouped diff queries', async () => {
    (EntityVersionDiff.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        {
          entityType: 'Course',
          entityId: 'COMP 248',
          academicYear: '2026-2027',
          patch: [{ op: 'replace', path: '/title', value: 'Updated' }],
        },
      ]),
    });

    const resolved = await resolveEntityVersions(
      'Course',
      [
        {
          _id: 'COMP 248',
          title: 'Intro',
          description: '',
          credits: 3,
          offeredIn: [],
          baseAcademicYear: '2025-2026',
        },
        {
          _id: 'COMP 249',
          title: 'Second',
          description: '',
          credits: 3,
          offeredIn: [],
          baseAcademicYear: '2025-2026',
        },
      ],
      '2026-2027',
    );

    expect(resolved[0].title).toBe('Updated');
    expect(resolved[1].title).toBe('Second');
  });

  it('loads direct diffs when resolving a single entity', async () => {
    (EntityVersionDiff.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        {
          entityType: 'CoursePool',
          entityId: 'POOL',
          academicYear: '2026-2027',
          patch: [{ op: 'replace', path: '/name', value: 'Updated Pool' }],
        },
      ]),
    });

    const resolved = await resolveEntityVersion({
      entityType: 'CoursePool',
      entityId: 'POOL',
      baseEntity: {
        _id: 'POOL',
        name: 'Pool',
        creditsRequired: 3,
        courses: [],
        baseAcademicYear: '2025-2026',
      },
      academicYear: '2026-2027',
    });

    expect(resolved.entity.name).toBe('Updated Pool');
  });

  it('uses provided diffs without querying the database', async () => {
    await expect(
      resolveEntityVersion({
        entityType: 'Course',
        entityId: 'COMP 248',
        baseEntity: {
          _id: 'COMP 248',
          title: 'Intro',
          description: '',
          credits: 3,
          offeredIn: [],
          baseAcademicYear: '2025-2026',
        },
        academicYear: '2026-2027',
        diffs: [
          {
            entityType: 'Course',
            entityId: 'COMP 248',
            academicYear: '2026-2027',
            patch: [{ op: 'replace', path: '/title', value: 'Updated' }],
          },
        ],
      }),
    ).resolves.toMatchObject({
      entity: {
        _id: 'COMP 248',
        title: 'Updated',
      },
      academicYear: '2026-2027',
    });

    expect(EntityVersionDiff.find).not.toHaveBeenCalled();
  });
});
