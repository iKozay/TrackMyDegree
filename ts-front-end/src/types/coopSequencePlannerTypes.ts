export type Season = "Fall" | "Winter" | "Summer";

export type TermType = "Academic" | "Co-op";


export type ProgramId =
  | "AERO"
  | "BLDG"
  | "CHEM"
  | "CIVI"
  | "COEN"
  | "ELEC"
  | "INDU"
  | "MECH"
  | "SOEN"
  | "COMP";

export type CourseCode = string;

/**
 * Template term definition (what the official/default sequence looks like).
 */
export type TermTemplate =
  | {
      type: "Academic";
      courses: CourseCode[];
    }
  | {
      type: "Co-op";
      coopLabel: string; // e.g. "Co-op Work Term I"
    };

/**
 * Template definition for a program's official sequence.
 * NOTE: `id` is template id (e.g., "SOEN_GENERAL_COOP").
 */
export type SequenceTemplate = {
  id: string; // e.g. "SOEN_GENERAL_COOP"
  programId: ProgramId;
  programName: string;
  coopTermsCount: number;
  terms: TermTemplate[]; // Term 1..N
};

/**
 * Concrete generated term (what the user edits).
 */
export type SequenceTerm =
  | {
      id: string;
      termNumber: number;
      season: Season;
      year: number;
      type: "Academic";
      courses: CourseCode[];
      // later: isUserAdded?: boolean;
    }
  | {
      id: string;
      termNumber: number;
      season: Season;
      year: number;
      type: "Co-op";
      coopLabel: string;
      // later: isUserAdded?: boolean;
    };

/**
 * Generated sequence instance for the UI.
 */
export type GeneratedSequence = {
  programId: ProgramId;
  programName: string;
  templateId: string;
  validated: boolean;
  defaultTerms: SequenceTerm[];
  currentTerms: SequenceTerm[];
};
