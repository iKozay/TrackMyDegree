import type { SequenceTemplate } from "../types/coopSequencePlannerTypes";

export const AEROSPACE_OPTION_C_TEMPLATE: SequenceTemplate = {
  id: "AERO_OPTION_C_COOP",
  programId: "AERO",
  programName: "Aerospace Engineering – Option C (Avionics & Aerospace Systems)",
  coopTermsCount: 3,

  terms: [
    // Term 1 - Fall (Academic)
    {
      type: "Academic",
      courses: ["AERO 201", "COEN 343", "ENGR 213", "ENGR 233", "ENGR 242"],
    },
    // Term 2 - Winter (Academic)
    {
      type: "Academic",
      courses: [
        "ELEC 273",
        "ENCS 282",
        "ENGR 243",
        "ENGR 244",
        "ENGR 251",
      ],
    },

    // Term 3 - Summer (Academic)
    {
      type: "Academic",
      courses: [
        "ELEC 242",
        "ENGR 201",
        "ENGR 202",
        "ENGR 371",
        "ENGR 391",
      ],
    },

    // Term 4 - Fall (Co-op)
    { type: "Co-op", coopLabel: "Work Term 1" },

    // Term 5 - Winter (Academic)

    {
      type: "Academic",
      courses: [
        "AERO 290",
        "AERO 371",
        "COEN 244",
        "ELEC 342",
        "ENGR 301",
      ],
    },

    // Term 6 - Summer (Academic)

    {
      type: "Academic",
      courses: [
        "COEN 231",
        "COEN 212",
        "ENGR 361",
        "ENGR 392",
      ],
    },

    // Term 7 - Fall (Academic)

    {
      type: "Academic",
      courses: [
        "AERO 390",
        "AERO 417",
        "COEN 311",
        "COEN 352",
        "General Studies",
      ],
    },

    // Term 8 - Winter (Co-op)

    { type: "Co-op", coopLabel: "Work Term 2" },

    // Term 9 - Summer (Co-op)

    { type: "Co-op", coopLabel: "Work Term 3" },

    // Term 10 - Fall (Academic)
    {
      type: "Academic",
      courses: [
        "AERO 482",
        "ELEC 481",
        "AERO 490",
        "Technical Electives",
      ],
    },
    
    // Term 11 - Winter (Academic)
    {
      type: "Academic",
      courses: [
        "AERO 483",
        "ELEC 483",
        "SOEN 341",
        "AERO 490",
        "Technical Electives",
      ],
    },
  ],
};
