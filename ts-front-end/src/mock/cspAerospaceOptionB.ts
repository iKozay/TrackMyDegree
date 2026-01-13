import type { SequenceTemplate } from "../types/coopSequencePlannerTypes";

export const AEROSPACE_OPTION_B_TEMPLATE: SequenceTemplate = {
  id: "AERO_OPTION_B_COOP",
  programId: "AERO",
  programName: "Aerospace Engineering – Option B (Structures and Materials)",
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
        "MIAE 313",
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
        "MECH 375",
      ],
    },

    // Term 7 - Fall (Academic)

    {
      type: "Academic",
      courses: [
        "AERO 390",
        "AERO 481",
        "MIAE 311",
        "MIAE 312",
        "MECH 352",
        "MECH 373",
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
        "AERO 431",
        "AERO 417",
        "MECH 412",
        "AERO 486",
        "AERO 490",
      ],
    },
    
    // Term 11 - Winter (Academic)
    {
      type: "Academic",
      courses: [
        "AERO 487",
        "MECH 460",
        "AERO 490",
        "General Studies",
      ],
    },
  ],
};
