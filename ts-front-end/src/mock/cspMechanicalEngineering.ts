import type { SequenceTemplate } from "../types/coopSequencePlannerTypes";

export const MECHANICAL_ENGINEERING_TEMPLATE: SequenceTemplate = {
  id: "MECH_GENERAL_COOP_FALL_ENTRY",
  programId: "MECH",
  programName: "Mechanical Engineering",
  coopTermsCount: 3,
  terms: [
    // Term 1 - Fall Year 1 (Academic)
    {
      type: "Academic",
      courses: ["ENGR 213", "ENGR 242", "MIAE 211", "MIAE 215", "MIAE 221"],
    },

    // Term 2 - Winter Year 1 (Academic)
    {
      type: "Academic",
      courses: ["ENCS 282", "ENGR 233", "ENGR 243", "ENGR 244", "MIAE 313"],
    },

    // Term 3 - Summer Year 1 (Academic)
    {
      type: "Academic",
      courses: ["ENGR 201", "ENGR 202", "ENGR 251", "ENGR 311", "MIAE 311", "MIAE 312"],
    },

    // Term 4 - Fall Year 2 (Co-op)
    { type: "Co-op", coopLabel: "Co-op Work Term I" },

    // Term 5 - Winter Year 2 (Academic)
    {
      type: "Academic",
      courses: ["MECH 321", "MECH 343", "MECH 351", "MECH 368", "MIAE 380"],
    },

    // Term 6 - Summer Year 2 (Academic)
    {
      type: "Academic",
      courses: ["ENGR 301", "ENGR 361", "ENGR 371", "ENGR 391", "MECH 370"],
    },

    // Term 7 - Fall Year 3 (Academic)
    {
      type: "Academic",
      courses: ["MECH 344", "MECH 352", "MECH 361", "MECH 371", "MECH 390"],
    },

    // Term 8 - Winter Year 3 (Co-op)
    { type: "Co-op", coopLabel: "Co-op Work Term II" },

    // Term 9 - Summer Year 3 (Co-op)
    { type: "Co-op", coopLabel: "Co-op Work Term III" },

    // Term 10 - Fall Year 4 (Academic)
    {
      type: "Academic",
      courses: ["MECH 373", "MECH 375", "MECH 490", "Technical Electives"],
    },

    // Term 11 - Winter Year 4 (Academic)
    {
      type: "Academic",
      courses: ["ENGR 392", "INDU 490", "General Studies", "Technical Electives"],
    },
  ],
};
