import type { SequenceTemplate } from "../types/coopSequencePlannerTypes";

export const COMPUTER_ENGINEERING_TEMPLATE: SequenceTemplate = {
  id: "COEN_GENERAL_COOP_FALL_ENTRY",
  programId: "COEN",
  programName: "Computer Engineering",
  coopTermsCount: 3,
  terms: [
    // Term 1 - Fall Year 1 (Academic)
    {
      type: "Academic",
      courses: ["COEN 243", "COEN 212", "COEN 231", "ENGR 213", "ENGR 201", "ENGR 202"],
    },

    // Term 2 - Winter Year 1 (Academic)
    {
      type: "Academic",
      courses: ["COEN 311", "ELEC 273", "COEN 244", "ENGR 233", "ENCS 282"],
    },

    // Term 3 - Summer Year 1 (Academic)
    {
      type: "Academic",
      courses: ["COEN 313", "COEN 352", "ENGR 371", "ENGR 391"],
    },

    // Term 4 - Fall Year 2 (Co-op)
    { type: "Co-op", coopLabel: "Co-op Work Term I" },

    // Term 5 - Winter Year 2 (Academic)
    {
      type: "Academic",
      courses: ["ELEC 242", "COEN 314", "SOEN 341", "ENGR 290", "COEN 346"],
    },

    // Term 6 - Summer Year 2 (Academic)
    {
      type: "Academic",
      courses: ["ELEC 372", "ELEC 342", "ENGR 392", "ENGR 301"],
    },

    // Term 7 - Fall Year 3 (Academic)
    {
      type: "Academic",
      courses: ["COEN 366", "COEN 390", "COEN 320", "COEN 316", "COEN 317"],
    },

    // Term 8 - Winter Year 3 (Co-op)
    { type: "Co-op", coopLabel: "Co-op Work Term II" },

    // Term 9 - Summer Year 3 (Co-op)
    { type: "Co-op", coopLabel: "Co-op Work Term III" },

    // Term 10 - Fall Year 4 (Academic)
    {
      type: "Academic",
      courses: ["COEN 490", "General Education Elective", "Elective", "Elective", "Elective"],
    },

    // Term 11 - Winter Year 4 (Academic)
    {
      type: "Academic",
      courses: ["COEN 490", "Elective", "Elective", "Elective", "Elective"],
    },
  ],
};
