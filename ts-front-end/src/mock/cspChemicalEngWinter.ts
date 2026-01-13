import type { SequenceTemplate } from "../types/coopSequencePlannerTypes";

export const CHEMICAL_ENG_WINTER_ENTRY_TEMPLATE: SequenceTemplate = {
  id: "CHME_WINTER_ENTRY_COOP",
  programId: "CHEM",
  programName: "Chemical Engineering (Co-op) — Winter Entry",
  coopTermsCount: 3,
  terms: [
    // Term 1 - Winter (Academic)
    {
      type: "Academic",
      courses: ["ENGR 201", "ENGR 213", "ENGR 245", "ENGR 251", "CHME 200", "CHME 214"],
    },

    // Term 2 - Summer (Academic)
    {
      type: "Academic",
      courses: ["ENGR 233", "ENCS 282", "ENGR 311"],
    },

    // Term 3 - Fall (Academic)
    {
      type: "Academic",
      courses: ["MIAE 221", "ENGR 361", "CHME 215", "CHME 220", "CHME 351"],
    },

    // Term 4 - Winter (Academic)
    {
      type: "Academic",
      courses: ["ENGR 202", "CHEM 221", "CHME 201", "CHME 216", "CHME 240"],
    },

    // Term 5 - Summer (Academic)
    {
      type: "Academic",
      courses: ["ENGR 301", "ENGR 371", "ENGR 392", "General Eduction Elective"],
    },

    // Term 6 - Fall (Co-op)
    { type: "Co-op", coopLabel: "Co-op Work Term I" },

    // Term 7 - Winter (Academic)
    {
      type: "Academic",
      courses: ["ENGR 391", "CHME 301", "CHME 320", "CHME 360"],
    },

    // Term 8 - Summer (Academic)
    {
      type: "Academic",
      courses: ["CHME 321", "CHME 361", "CHME 470", "Technical Elective"],
    },

    // Term 9 - Fall (Academic)
    {
      type: "Academic",
      courses: ["CHME 300", "CHME 330", "CHME 340", "CHME 362", "CHME 390"],
    },

    // Term 10 - Winter (Co-op)
    { type: "Co-op", coopLabel: "Co-op Work Term II" },

    // Term 11 - Summer (Co-op)
    { type: "Co-op", coopLabel: "Co-op Work Term III" },

    // Term 12 - Fall (Academic)
    {
      type: "Academic",
      courses: ["CHME 490", "CHME 316", "CHME 415", "CHME 440", "CHME 352"],
    },

    // Term 13 - Winter (Academic)  (capstone continuation shown as Winter: 3 credits)
    {
      type: "Academic",
      courses: ["CHME 490"],
    },
  ],
};
