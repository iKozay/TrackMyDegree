import type { SequenceTemplate } from "../types/coopSequencePlannerTypes";

export const COMPUTER_SCIENCE_TEMPLATE: SequenceTemplate = {
  id: "COMP_GENERAL_COOP",
  programId: "COMP",
  programName: "Computer Science",
  coopTermsCount: 3,
  terms: [
    // Term 1 - Fall Year 1 (Academic)
    {
      type: "Academic",
      courses: ["COMP 232", "COMP 248", "General Education Elective", "General Education Elective", "General Education Elective"],
    },

    // Term 2 - Winter Year 1 (Academic)
    {
      type: "Academic",
      courses: ["COMP 228", "COMP 233", "COMP 249", "ENCS 282", "Elective"],
    },

    // Term 3 - Summer Year 1 (Academic)
    {
      type: "Academic",
      courses: ["COMP 348", "COMP 352", "Electives"],
    },

    // Term 4 - Fall Year 2 (Co-op)
    { type: "Co-op", coopLabel: "Co-op Work Term I" },

    // Term 5 - Winter Year 2 (Academic)
    {
      type: "Academic",
      courses: ["COMP 346", "COMP 354", "Electives"],
    },

    // Term 6 - Summer Year 2 (Co-op)
    { type: "Co-op", coopLabel: "Co-op Work Term II" },

    // Term 7 - Fall Year 3 (Academic)
    {
      type: "Academic",
      courses: ["ENCS 393", "Electives"],
    },

    // Term 8 - Winter Year 3 (Co-op)
    { type: "Co-op", coopLabel: "Co-op Work Term III" },

    // Term 9 - Summer Year 3 (Academic)
    {
      type: "Academic",
      courses: ["COMP 335", "Electives"],
    },
  ],
};
