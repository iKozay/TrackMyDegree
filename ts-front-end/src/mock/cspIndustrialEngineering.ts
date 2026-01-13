import type { SequenceTemplate } from "../types/coopSequencePlannerTypes";

export const INDUSTRIAL_ENGINEERING_TEMPLATE: SequenceTemplate = {
  id: "INDU_GENERAL_COOP_FALL_ENTRY",
  programId: "INDU",
  programName: "Industrial Engineering",
  coopTermsCount: 3,
  terms: [
    // Term 1 - Fall Year 1 (Academic)
    {
      type: "Academic",
      courses: ["ENGR 213", "INDU 211", "MIAE 211", "MIAE 215", "MIAE 221"],
    },

    // Term 2 - Winter Year 1 (Academic)
    {
      type: "Academic",
      courses: ["ACCO 220", "ENCS 282", "ENGR 201", "ENGR 245", "MIAE 313"],
    },

    // Term 3 - Summer Year 1 (Academic)
    {
      type: "Academic",
      courses: ["ENGR 202", "ENGR 233", "ENGR 251", "ENGR 371", "MIAE 311", "MIAE 312"],
    },

    // Term 4 - Fall Year 2 (Co-op)
    { type: "Co-op", coopLabel: "Co-op Work Term I" },

    // Term 5 - Winter Year 2 (Academic)
    {
      type: "Academic",
      courses: ["INDU 323", "INDU 371", "INDU 371", "INDU 411", "MIAE 380"],
    },

    // Term 6 - Summer Year 2 (Academic)
    {
      type: "Academic",
      courses: ["ENGR 301", "ENGR 311", "ENGR 391", "ENGR 392"],
    },

    // Term 7 - Fall Year 3 (Academic)
    {
      type: "Academic",
      courses: ["INDU 311", "INDU 320", "INDU 324", "INDU 330", "INDU 412"],
    },

    // Term 8 - Winter Year 3 (Co-op)
    { type: "Co-op", coopLabel: "Co-op Work Term II" },

    // Term 9 - Summer Year 3 (Co-op)
    { type: "Co-op", coopLabel: "Co-op Work Term III" },

    // Term 10 - Fall Year 4 (Academic)
    {
      type: "Academic",
      courses: ["INDU 421", "INDU 423", "INDU 490", "Technical Electives"],
    },

    // Term 11 - Winter Year 4 (Academic)
    {
      type: "Academic",
      courses: ["INDU 321", "INDU 342", "INDU 490", "Technical Electives"],
    },
  ],
};
