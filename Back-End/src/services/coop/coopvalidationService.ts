// Back-End/src/services/CoopValidationService.ts
import type { TimelineDocument } from "@models/timeline";
import type { TimelineResult } from "@services/timeline/timelineService";

export type RuleSeverity = "ERROR" | "WARNING";

export interface CoopRuleResult {
  ruleId: string;
  message: string;
  severity: RuleSeverity;
  affectedTerms?: string[];
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

interface SemesterData {
  _id: string;
  term: string;
  courses: { code: string; message?: string | null }[];
}

/**
 * Converts Mongoose DocumentArray to plain JS array
 * This avoids TS2590 "Expression produces a union type that is too complex to represent"
 */
function extractSemestersFromDocument(timeline: TimelineDocument): SemesterData[] {
  if (!timeline.semesters) return [];
  
  return Array.from(timeline.semesters).map((semester) => {
    const sem = semester.toObject();
    const courses = Array.isArray(sem.courses) 
      ? sem.courses 
      : Array.from(sem.courses || []);
    
    return {
      _id: sem._id.toString(),
      term: sem.term,
      courses: courses.map((c: any) => ({
        code: c.code,
        message: c.message,
      })),
    };
  });
}

/**
 * Extracts semesters from TimelineResult (plain object from cache)
 */
function extractSemestersFromResult(timeline: TimelineResult): SemesterData[] {
  if (!timeline.semesters) return [];
  
  return timeline.semesters.map((semester) => ({
    _id: semester._id?.toString() || '',
    term: semester.term,
    courses: (semester.courses || []).map((c) => ({
      code: c.code,
      message: c.message,
    })),
  }));
}

/**
 * Main validation entry point for Co-op timelines
 * Accepts both TimelineDocument (Mongoose) and TimelineResult (plain object)
 */
export function validateCoopTimeline(
  timeline: TimelineDocument | TimelineResult
): CoopValidationResult {
  const errors: CoopRuleResult[] = [];
  const warnings: CoopRuleResult[] = [];

  // Detect which type we received and extract accordingly
  const semestersArray = 'toObject' in timeline
    ? extractSemestersFromDocument(timeline as TimelineDocument)
    : extractSemestersFromResult(timeline as TimelineResult);

  const studyTerms = semestersArray.filter((s) => s.term === "STUDY");
  const workTerms = semestersArray.filter((s) => s.term === "WORK");

  // -----------------------------
  // RULE: Must begin with study
  // -----------------------------
  if (semestersArray.length > 0 && semestersArray[0].term !== "STUDY") {
    errors.push({
      ruleId: "SEQ_STARTS_WITH_STUDY",
      message: "Degree must begin with a study term.",
      severity: "ERROR",
    });
  }

  // -----------------------------
  // RULE: Must end with study
  // -----------------------------
  if (
    semestersArray.length > 0 &&
    semestersArray[semestersArray.length - 1].term !== "STUDY"
  ) {
    errors.push({
      ruleId: "SEQ_ENDS_WITH_STUDY",
      message: "Degree must end with a study term.",
      severity: "ERROR",
    });
  }

  // -----------------------------
  // RULE: Exactly 3 work terms
  // -----------------------------
  if (workTerms.length !== 3) {
    errors.push({
      ruleId: "THREE_WORK_TERMS_REQUIRED",
      message:
        "Undergraduate Co-op students must complete exactly 3 work terms.",
      severity: "ERROR",
    });
  }

  // -----------------------------
  // RULE: At least 2 study terms before first work
  // -----------------------------
  const firstWorkIndex = semestersArray.findIndex((s) => s.term === "WORK");
  if (firstWorkIndex !== -1) {
    const studyBeforeFirstWork = semestersArray
      .slice(0, firstWorkIndex)
      .filter((s) => s.term === "STUDY").length;

    if (studyBeforeFirstWork < 2) {
      errors.push({
        ruleId: "MIN_TWO_STUDY_BEFORE_WORK",
        message:
          "At least two study terms are required before the first work term.",
        severity: "ERROR",
      });
    }
  }

  // -----------------------------
  // RULE: No consecutive work terms
  // -----------------------------
  for (let i = 1; i < semestersArray.length; i++) {
    if (
      semestersArray[i].term === "WORK" &&
      semestersArray[i - 1].term === "WORK"
    ) {
      errors.push({
        ruleId: "NO_CONSECUTIVE_WORK_TERMS",
        message: "Consecutive work terms are not allowed.",
        severity: "ERROR",
        affectedTerms: [semestersArray[i - 1]._id, semestersArray[i]._id],
      });
    }
  }

  // -----------------------------
  // WARNING: Long sequence (>8 terms)
  // -----------------------------
  if (semestersArray.length > 8) {
    warnings.push({
      ruleId: "LONG_SEQUENCE_WARNING",
      message:
        "This course sequence is longer than the typical co-op duration.",
      severity: "WARNING",
    });
  }

  // -----------------------------
  // Final result
  // -----------------------------
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metadata: {
      totalTerms: semestersArray.length,
      studyTerms: studyTerms.length,
      workTerms: workTerms.length,
    },
  };
}