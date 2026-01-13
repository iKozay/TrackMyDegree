import type { SequenceTemplate } from "../types/coopSequencePlannerTypes";

export const BUILDING_ENGINEERING_TEMPLATE: SequenceTemplate = {
  id: "BLDG_GENERAL_COOP",
  programId: "BLDG",
  programName: "Building Engineering",
  coopTermsCount: 3,
  terms: [
    // Term 1 - Fall (Academic)
    {
      type: "Academic",
      courses: ["BCEE 231", "BLDG 212", "BLDG 341", "ENGR 213", "ENGR 242"],
    },
    // Term 2 - Winter (Academic)
    {
      type: "Academic",
      courses: ["ENGR 201", "ENGR 233", "ENGR 243", "ENGR 244", "ENGR 251"],
    },
    // Term 3 - Summer (Academic)
    {
      type: "Academic",
      courses: ["BCEE 342", "BCEE 371", "ENCS 282", "ENGR 311", "ENGR 361"],
    },

    // Term 4 - Fall (Co-op)
    { type: "Co-op", coopLabel: "Co-op Work Term I" },

    // Term 5 - Winter (Academic)
    {
      type: "Academic",
      courses: ["BCEE 344", "BLDG 365", "ELEC 275", "BLDG 371", "CIVI 321"],
    },
    // Term 6 - Summer (Academic)
    {
      type: "Academic",
      courses: ["General Education Elective", "ENGR 301", "ENGR 371", "ENGR 391"],
    },

    // Term 7 - Fall (Academic)
    {
      type: "Academic",
      courses: ["BCEE 345", "BLDG 390", "BLDG 476", "BCEE 432", "Technical Elective"],
    },

    // Term 8 - Winter (Co-op)
    { type: "Co-op", coopLabel: "Co-op Work Term II" },

    // Term 9 - Summer (Co-op)
    { type: "Co-op", coopLabel: "Co-op Work Term III" },

    // Term 10 - Fall (Academic)
    {
      type: "Academic",
      courses: ["BLDG 463", "BLDG 471", "BLDG 490", "Technical Elective"],
    },
    // Term 11 - Winter (Academic)
    {
      type: "Academic",
      courses: ["BLDG 490", "BLDG 482", "BCEE 451", "Technical Elective", "Technical Elective", "Technical Elective"],
    },
  ],
};
