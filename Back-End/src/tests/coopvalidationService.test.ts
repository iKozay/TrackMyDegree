import { validateCoopTimeline } from '../services/coop/coopvalidationService';

describe('validateCoopTimeline', () => {
  it('validates a correct timeline (BEng, 12 terms, 3 work terms, no errors)', () => {
    const timeline = {
      degree: { _id: 'BEng-123' },
      semesters: [
        // 2 study, 1 work, 2 study, 1 work, 2 study, 1 work, 3 study
        ...Array(2).fill({ courses: [{ code: 'MATH 101' }] }),
        { courses: [{ code: 'CWT 100' }] },
        ...Array(2).fill({ courses: [{ code: 'COMP 248' }] }),
        { courses: [{ code: 'CWT 200' }] },
        ...Array(2).fill({ courses: [{ code: 'SOEN 287' }] }),
        { courses: [{ code: 'CWT 300' }] },
        ...Array(3).fill({ courses: [{ code: 'ELEC 275' }] }),
      ],
    };
    const result = validateCoopTimeline(timeline);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.metadata.totalTerms).toBe(12);
    expect(result.metadata.workTerms).toBe(3);
    expect(result.metadata.studyTerms).toBe(9);
  });

  it('detects missing work terms', () => {
    const timeline = {
      semesters: [
        ...Array(12).fill({ courses: [{ code: 'MATH 101' }] }),
      ],
    };
    const result = validateCoopTimeline(timeline);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.ruleId === 'THREE_WORK_TERMS_REQUIRED')).toBe(true);
  });

  it('detects not starting with study', () => {
    const timeline = {
      semesters: [
        { courses: [{ code: 'CWT 100' }] },
        ...Array(11).fill({ courses: [{ code: 'MATH 101' }] }),
      ],
    };
    const result = validateCoopTimeline(timeline);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.ruleId === 'SEQ_STARTS_WITH_STUDY')).toBe(true);
  });

  it('detects not ending with study', () => {
    const timeline = {
      semesters: [
        ...Array(11).fill({ courses: [{ code: 'MATH 101' }] }),
        { courses: [{ code: 'CWT 100' }] },
      ],
    };
    const result = validateCoopTimeline(timeline);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.ruleId === 'SEQ_ENDS_WITH_STUDY')).toBe(true);
  });

  it('detects less than 2 study terms before first work', () => {
    const timeline = {
      semesters: [
        { courses: [{ code: 'MATH 101' }] },
        { courses: [{ code: 'CWT 100' }] },
        ...Array(10).fill({ courses: [{ code: 'MATH 101' }] }),
      ],
    };
    const result = validateCoopTimeline(timeline);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.ruleId === 'MIN_TWO_STUDY_BEFORE_WORK')).toBe(true);
  });

  it('detects consecutive work terms', () => {
    const timeline = {
      semesters: [
        { courses: [{ code: 'MATH 101' }] },
        { courses: [{ code: 'CWT 100' }] },
        { courses: [{ code: 'CWT 200' }] },
        ...Array(9).fill({ courses: [{ code: 'MATH 101' }] }),
      ],
    };
    const result = validateCoopTimeline(timeline);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.ruleId === 'NO_CONSECUTIVE_WORK_TERMS')).toBe(true);
  });

  it('warns if timeline is longer than max terms (BEng)', () => {
    const timeline = {
      degree: { _id: 'BEng degree' },
      semesters: Array(13).fill({ courses: [{ code: 'MATH 101' }] }),
    };
    const result = validateCoopTimeline(timeline);
    expect(result.warnings.some(w => w.ruleId === 'LONG_SEQUENCE_WARNING')).toBe(true);
  });

  it('warns if timeline is longer than max terms (non-BEng)', () => {
    const timeline = {
      degree: { _id: 'BCompSc degree' },
      semesters: Array(10).fill({ courses: [{ code: 'MATH 101' }] }),
    };
    const result = validateCoopTimeline(timeline);
    expect(result.warnings.some(w => w.ruleId === 'LONG_SEQUENCE_WARNING')).toBe(true);
  });
});
