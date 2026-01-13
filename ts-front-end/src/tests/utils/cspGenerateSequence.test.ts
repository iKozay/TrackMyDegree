import { describe, it, expect } from "vitest";
import { computeCoopCount, computeNextTermSeasonYear, generateFromTemplate, getLastTerm } from "../../utils/cspGenerateSequence";
import type { SequenceTemplate } from "../../types/coopSequencePlannerTypes";

describe("cspGenerateSequence", () => {
  it("computeCoopCount counts only Co-op terms", () => {
    const terms: any[] = [
      { type: "Academic", id: "1", termNumber: 1, season: "Fall", year: 2026, courses: [] },
      { type: "Co-op", id: "2", termNumber: 2, season: "Winter", year: 2027, coopLabel: "Work Term 1" },
      { type: "Co-op", id: "3", termNumber: 3, season: "Summer", year: 2027, coopLabel: "Work Term 2" },
    ];

    expect(computeCoopCount(terms as any)).toBe(2);
  });

  it("getLastTerm returns null for empty and last term otherwise", () => {
    expect(getLastTerm([] as any)).toBeNull();
    const terms: any[] = [
      { type: "Academic", id: "a", termNumber: 1, season: "Fall", year: 2026, courses: [] },
      { type: "Co-op", id: "b", termNumber: 2, season: "Winter", year: 2027, coopLabel: "Work Term 1" },
    ];
    expect(getLastTerm(terms as any)?.id).toBe("b");
  });

  it("computeNextTermSeasonYear cycles seasons and increments year only on Fall -> Winter", () => {
    expect(computeNextTermSeasonYear("Fall", 2026)).toEqual({ season: "Winter", year: 2027 });
    expect(computeNextTermSeasonYear("Winter", 2027)).toEqual({ season: "Summer", year: 2027 });
    expect(computeNextTermSeasonYear("Summer", 2027)).toEqual({ season: "Fall", year: 2027 });
  });

  it("generateFromTemplate generates terms with correct season/year and keeps defaults separate from current", () => {
    const template: SequenceTemplate = {
      id: "TEST_TEMPLATE",
      programId: "SOEN",
      programName: "Software Engineering",
      coopTermsCount: 1,
      terms: [
        { type: "Academic", courses: ["COMP 248"] },
        { type: "Co-op", coopLabel: "Work Term I" },
        { type: "Academic", courses: ["SOEN 228"] },
      ],
    };

    const seq = generateFromTemplate(template, "Fall", 2026);

    expect(seq.programId).toBe("SOEN");
    expect(seq.programName).toBe("Software Engineering");
    expect(seq.templateId).toBe("TEST_TEMPLATE");
    expect(seq.validated).toBe(false);

    expect(seq.defaultTerms).toHaveLength(3);
    expect(seq.currentTerms).toHaveLength(3);

    // Fall 2026, Winter 2027, Summer 2027
    expect(seq.currentTerms[0].season).toBe("Fall");
    expect(seq.currentTerms[0].year).toBe(2026);

    expect(seq.currentTerms[1].season).toBe("Winter");
    expect(seq.currentTerms[1].year).toBe(2027);

    expect(seq.currentTerms[2].season).toBe("Summer");
    expect(seq.currentTerms[2].year).toBe(2027);

    // Defaults are cloned (not same object references)
    expect(seq.defaultTerms[0]).not.toBe(seq.currentTerms[0]);
  });
});
