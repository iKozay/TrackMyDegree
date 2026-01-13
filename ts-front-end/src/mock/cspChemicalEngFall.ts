import type { SequenceTemplate } from "../types/coopSequencePlannerTypes";

export const CHEMICAL_ENG_FALL_ENTRY_TEMPLATE: SequenceTemplate = {
  id: "CHME_COOP_FALL_ENTRY",
  programId: "CHEM",
  programName: "Chemical Engineering (Co-op) — Fall Entry",
  coopTermsCount: 3,
  terms: [
    // Term 1 - Fall (Academic)
    {
      type: "Academic",
      courses: ["ENGR 213", "CHME 200", "CHME 215", "MIAE 221", "CHEM 214", "ENGR 201"],
    },
    // Term 2 - Winter (Academic)
    {
      type: "Academic",
      courses: ["ENGR 233", "CHME 221", "CHME 216", "CHME 220", "ENGR 251"],
    },
    // Term 3 - Summer (Academic)
    {
      type: "Academic",
      courses: ["ENGR 361", "ENCS 282", "CHME 351", "ENGR 311", "ENGR 301"],
    },
    // Term 4 - Fall (Academic)
    { type: "Co-op", coopLabel: "Co-op Work Term I" },

    // Term 5 - Winter (Academic)
    {
      type: "Academic",
      courses: ["ENGR 245", "CHME 240", "CHME 201", "CHME 301", "CHME 320", "CHME 360"],
    },
    // Term 6 - Summer (Co-op)
    {
      type: "Academic",
      courses: ["ENGR 202", "ENGR 371", "CHME 321", "CHME 361", "CHME 470"],
    },

    // Term 7 - Fall (Academic)
    {
      type: "Academic",
      courses: ["ENGR 391", "CHME 300", "CHME 330", "CHME 340", "ENGR 362", "CHME 390"],
    },
    // Term 8 - Winter (Academic)
    { type: "Co-op", coopLabel: "Co-op Work Term II" },

    // Term 9 - Summer (Co-op)
    { type: "Co-op", coopLabel: "Co-op Work Term III" },

    // Term 10 - Fall (Academic)
    {
      type: "Academic",
      courses: ["CHME 316", "CHME 352", "CHME 415", "CHME 440", "CHME 490"],
    },
    // Term 11 - Winter (Academic)
    {
      type: "Academic",
      courses: ["ENGR 392", "CHME 490", "Technical Elective", "General Education Elective"],
    },
  ],
};
