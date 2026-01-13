import type { SequenceTemplate } from "../types/coopSequencePlannerTypes";

export const AEROSPACE_OPTION_A_TEMPLATE: SequenceTemplate = {
  id: "AERO_OPTION_A_COOP",
  programId: "AERO",
  programName: "Aerospace Engineering – Option A (Aerodynamics and Propulsion)",
  coopTermsCount: 3,

  terms: [
    // Term 1 - Fall (Academic)
    {
      type: "Academic",
      courses: ["AERO 201", "ENGR 201", "ENGR 213", "ENGR 242", "MIAE 215"],
    },
    // Term 2 - Winter (Academic)
    {
      type: "Academic",
      courses: [
        "ENCS 282",
        "ENGR 233",
        "ENGR 243",
        "ENGR 244",
        "ENGR 251",
      ],
    },

    // Term 3 - Summer (Academic)
    {
      type: "Academic",
      courses: [
        "ENGR 202",
        "ENGR 311",
        "ENGR 361",
        "ENGR 371",
        "MIAE 211",
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
        "MECH 343",
        "MECH 352",
        "MIAE 211",
      ],
    },

    // Term 6 - Summer (Academic)

    {
      type: "Academic",
      courses: [
        "ENGR 301",
        "ENGR 391",
        "ENGR 392",
        "General Studies",
      ],
    },

    // Term 7 - Fall (Academic)

    {
      type: "Academic",
      courses: [
        "AERO 390",
        "AERO 417",
        "AERO 481",
        "MECH 361",
        "MECH 351",
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
        "AERO 462",
        "AERO 464",
        "MECH 461",
        "AERO 490",
        "Technical Elective",
      ],
    },
    
    // Term 11 - Winter (Academic)
    {
      type: "Academic",
      courses: [
        "AERO 446",
        "AERO 465",
        "AERO 455",
        "AERO 490",
        "Technical Elective",
      ],
    },
  ],
};
