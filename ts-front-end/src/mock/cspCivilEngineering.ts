import type { SequenceTemplate } from "../types/coopSequencePlannerTypes";

export const CIVIL_ENGINEERING_TEMPLATE: SequenceTemplate = {
  id: "CIVI_GENERAL_COOP",
  programId: "CIVI",
  programName: "Civil Engineering",
  coopTermsCount: 3,
  terms: [
    // Term 1 - Fall (Academic)
    {
      type: "Academic",
      courses: ["BCEE 231", "CIVI 212", "CIVI 231", "ENGR 213", "ENGR 242"],
    },

    // Term 2 - Winter (Academic)
    {
      type: "Academic",
      courses: ["ENGR 201", "ENGR 233", "ENGR 243", "ENGR 244", "ENGR 251"],
    },

    // Term 3 - Summer (Academic)
    {
      type: "Academic",
      courses: ["BCEE 342", "ELEC 275", "ENGR 202", "ENCS 282", "ENGR 361"],
    },

    // Term 4 - Fall (Co-op)
    { type: "Co-op", coopLabel: "Co-op Work Term I" },

    // Term 5 - Winter (Academic)
    {
      type: "Academic",
      courses: ["General Education Elective", "BCEE 344", "CIVI 321", "CIVI 341", "CIVI 361"],
    },

    // Term 6 - Summer (Academic)
    {
      type: "Academic",
      courses: ["ENGR 311", "ENGR 301", "ENGR 391", "ENGR 392", "BCEE 371"],
    },

    // Term 7 - Fall (Academic)
    {
      type: "Academic",
      courses: ["BCEE 345", "CIVI 372", "BCEE 343", "CIVI 390", "BCEE 432"],
    },

    // Term 8 - Winter (Co-op)
    { type: "Co-op", coopLabel: "Co-op Work Term II" },

    // Term 9 - Summer (Co-op)
    { type: "Co-op", coopLabel: "Co-op Work Term III" },

    // Term 10 - Fall (Academic)
    {
      type: "Academic",
      courses: ["ENGR 371", "CIVI 490", "CIVI 381", "Technical Elective", "Technical Elective"],
    },

    // Term 11 - Winter (Academic)
    {
      type: "Academic",
      courses: ["CIVI 490", "BCEE 451", "Technical Elective", "Technical Elective", "Technical Elective"],
    },
  ],
};
