import {
  applyVersionPatch,
  compareAcademicYears,
  normalizeAcademicYear,
  resolveEntityVersionFromDiffs,
} from '@services/catalogVersionService';

describe('catalogVersionService', () => {
  it('normalizes supported academic year formats', () => {
    expect(normalizeAcademicYear('2026')).toBe('2026-2027');
    expect(normalizeAcademicYear('2026-27')).toBe('2026-2027');
    expect(normalizeAcademicYear('2026-2027')).toBe('2026-2027');
  });

  it('rejects invalid academic year ranges', () => {
    expect(() => normalizeAcademicYear('2026-2028')).toThrow(
      'Invalid academic year',
    );
  });

  it('applies JSON patches sequentially', () => {
    const resolved = resolveEntityVersionFromDiffs({
      entityType: 'Course',
      entityId: 'COMP 248',
      baseEntity: {
        _id: 'COMP 248',
        title: 'Intro',
        description: 'A',
        credits: 3,
        offeredIn: ['fall'],
        baseAcademicYear: '2025-2026',
      },
      academicYear: '2027-2028',
      diffs: [
        {
          entityType: 'Course',
          entityId: 'COMP 248',
          academicYear: '2026-2027',
          patch: [
            { op: 'replace', path: '/title', value: 'Intro to Programming' },
            { op: 'add', path: '/offeredIn/1', value: 'winter' },
          ],
        },
        {
          entityType: 'Course',
          entityId: 'COMP 248',
          academicYear: '2027-2028',
          patch: [{ op: 'replace', path: '/credits', value: 4 }],
        },
      ],
    });

    expect(resolved.academicYear).toBe('2027-2028');
    expect(resolved.entity).toMatchObject({
      title: 'Intro to Programming',
      credits: 4,
      offeredIn: ['fall', 'winter'],
      baseAcademicYear: '2027-2028',
    });
  });

  it('throws when the requested year is earlier than the base year', () => {
    expect(() =>
      resolveEntityVersionFromDiffs({
        entityType: 'Degree',
        entityId: 'SOEN',
        baseEntity: {
          _id: 'SOEN',
          name: 'Software Engineering',
          totalCredits: 120,
          coursePools: [],
          ecpDegreeId: '',
          baseAcademicYear: '2026-2027',
        },
        academicYear: '2025-2026',
        diffs: [],
      }),
    ).toThrow('earlier than base academic year');
  });

  it('applies a standalone JSON patch document', () => {
    const result = applyVersionPatch({ _id: 'pool', courses: ['COMP 248'] }, [
      { op: 'add', path: '/courses/1', value: 'COMP 249' },
    ]);

    expect(result).toEqual({
      _id: 'pool',
      courses: ['COMP 248', 'COMP 249'],
    });
  });

  it('sorts academic years by start year', () => {
    const years = ['2028-2029', '2026-2027', '2027-2028'];
    years.sort(compareAcademicYears);

    expect(years).toEqual(['2026-2027', '2027-2028', '2028-2029']);
  });
});
