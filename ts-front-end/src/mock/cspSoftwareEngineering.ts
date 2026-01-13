import type { SequenceTemplate } from "../types/coopSequencePlannerTypes";

export const SOFTWARE_ENGINEERING_TEMPLATE: SequenceTemplate = {
  id: "SOEN_GENERAL_COOP",
  programId: "SOEN",
  programName: "Software Engineering",
  coopTermsCount: 3,
  terms: [
    // Term 1 - Fall (Academic)
    {
      type: "Academic",
      courses: ["COMP 232", "COMP 248", "ENGR 201", "ENGR 213", "GEN ED ELECTIVE"],
    },
    // Term 2 - Winter (Academic)
    {
      type: "Academic",
      courses: ["COMP 249", "ENGR 233", "SOEN 228", "SOEN 287", "NATURAL SCIENCE (SOEN)"],
    },
    // Term 3 - Summer (Academic)
    {
      type: "Academic",
      courses: ["COMP 348", "COMP 352", "ENCS 282", "ENGR 202", "ENGR 371"],
    },
    // Term 4 - Fall (Co-op)
    { type: "Co-op", coopLabel: "Co-op Work Term I" },

    // Term 5 - Winter (Academic)
    {
      type: "Academic",
      courses: ["COMP 346", "ELEC 275", "SOEN 331", "SOEN 341"],
    },
    // Term 6 - Summer (Co-op)
    { type: "Co-op", coopLabel: "Co-op Work Term II" },

    // Term 7 - Fall (Academic)
    {
      type: "Academic",
      courses: ["COMP 335", "SOEN 342", "SOEN 343", "SOEN 384"],
    },
    // Term 8 - Winter (Academic)
    {
      type: "Academic",
      courses: ["SOEN 363", "SOEN 345", "SOEN 357", "SOEN 390", "ELECTIVE"],
    },
    // Term 9 - Summer (Co-op)
    { type: "Co-op", coopLabel: "Co-op Work Term III" },

    // Term 10 - Fall (Academic)
    {
      type: "Academic",
      courses: ["ENGR 301", "SOEN 321", "SOEN 490", "ELECTIVE"],
    },
    // Term 11 - Winter (Academic)
    {
      type: "Academic",
      courses: ["ENGR 392", "ENGR 391", "SOEN 490", "ELECTIVE"],
    },
  ],
};
