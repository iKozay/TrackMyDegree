export type RuleSeverity = 'ERROR' | 'WARNING';

export interface CoopRuleResult {
  ruleId: string;
  message: string;
  severity: RuleSeverity;
}

export interface CoopValidationResult {
  valid: boolean;
  errors: CoopRuleResult[];
  warnings: CoopRuleResult[];
  metadata: {
    totalTerms: number;
    studyTerms: number;
    workTerms: number;
  };
}

/**
 * A semester is a WORK term if it contains:
 * CWT100, CWT200, or CWT300
 */
function isWorkTerm(semester: any): boolean {
  if (!semester || !Array.isArray(semester.courses)) {
    return false;
  }

  return semester.courses.some((course: any) =>
    ['CWT100', 'CWT200', 'CWT300'].includes(course.code)
  );
}

/**
 * Main validation entry point
 * Input: plain JS object from Redis cache
 */
export function validateCoopTimeline(timeline: any): CoopValidationResult {
  const errors: CoopRuleResult[] = [];
  const warnings: CoopRuleResult[] = [];

  const semesters = Array.isArray(timeline?.semesters)
    ? timeline.semesters
    : [];

  const termTypes = semesters.map((semester: any) =>
    isWorkTerm(semester) ? 'WORK' : 'STUDY'
  );

  const studyTerms = termTypes.filter((t) => t === 'STUDY');
  const workTerms = termTypes.filter((t) => t === 'WORK');

  // Must start with study
  if (termTypes.length > 0 && termTypes[0] !== 'STUDY') {
    errors.push({
      ruleId: 'SEQ_STARTS_WITH_STUDY',
      message: 'Degree must begin with a study term.',
      severity: 'ERROR',
    });
  }

  // Must end with study
  if (
    termTypes.length > 0 &&
    termTypes[termTypes.length - 1] !== 'STUDY'
  ) {
    errors.push({
      ruleId: 'SEQ_ENDS_WITH_STUDY',
      message: 'Degree must end with a study term.',
      severity: 'ERROR',
    });
  }

  // Exactly 3 work terms
  if (workTerms.length !== 3) {
    errors.push({
      ruleId: 'THREE_WORK_TERMS_REQUIRED',
      message:
        'Undergraduate Co-op students must complete exactly 3 work terms.',
      severity: 'ERROR',
    });
  }

  // At least 2 study terms before first work
  const firstWorkIndex = termTypes.indexOf('WORK');
  if (firstWorkIndex !== -1) {
    const studyBeforeFirstWork = termTypes
      .slice(0, firstWorkIndex)
      .filter((t) => t === 'STUDY').length;

    if (studyBeforeFirstWork < 2) {
      errors.push({
        ruleId: 'MIN_TWO_STUDY_BEFORE_WORK',
        message:
          'At least two study terms are required before the first work term.',
        severity: 'ERROR',
      });
    }
  }

  // No consecutive work terms
  for (let i = 1; i < termTypes.length; i++) {
    if (termTypes[i] === 'WORK' && termTypes[i - 1] === 'WORK') {
      errors.push({
        ruleId: 'NO_CONSECUTIVE_WORK_TERMS',
        message: 'Consecutive work terms are not allowed.',
        severity: 'ERROR',
      });
    }
  }

  // Warning if timeline is long
  if (termTypes.length > 8) {
    warnings.push({
      ruleId: 'LONG_SEQUENCE_WARNING',
      message:
        'This course sequence is longer than the typical co-op duration.',
      severity: 'WARNING',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metadata: {
      totalTerms: termTypes.length,
      studyTerms: studyTerms.length,
      workTerms: workTerms.length,
    },
  };
}
