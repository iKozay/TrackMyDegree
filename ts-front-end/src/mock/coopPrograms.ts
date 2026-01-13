import type { ProgramId } from "../types/coopSequencePlannerTypes";

export type ProgramConfig = {
  id: ProgramId;
  title: string;
  subtitle: string;
  mode:
    | { kind: "direct" }
    | { kind: "option"; options: string[] }
    | { kind: "entry"; entries: Array<"Fall" | "Winter"> };
};

export const COOP_PROGRAMS: ProgramConfig[] = [
  {
    id: "AERO",
    title: "Aerospace Engineering",
    subtitle: "Choose Option A, B, or C",
    mode: { kind: "option", options: ["Option A - Aerodynamics and Propulsion", "Option B - Structures and Materials", "Option C - Avionics & Aerospace Systems"] },
  },
  {
    id: "BLDG",
    title: "Building Engineering",
    subtitle: "General & Co-op Sequence",
    mode: { kind: "direct" },
  },
  {
    id: "CHEM",
    title: "Chemical Engineering",
    subtitle: "Choose Fall or Winter entry",
    mode: { kind: "entry", entries: ["Fall", "Winter"] },
  },
  {
    id: "CIVI",
    title: "Civil Engineering",
    subtitle: "General & Co-op Sequence",
    mode: { kind: "direct" },
  },
  {
    id: "COEN",
    title: "Computer Engineering",
    subtitle: "General & Co-op Sequence",
    mode: { kind: "direct" },
  },
  {
    id: "ELEC",
    title: "Electrical Engineering",
    subtitle: "General & Co-op Sequence",
    mode: { kind: "direct" },
  },
  {
    id: "INDU",
    title: "Industrial Engineering",
    subtitle: "Fall Entry Co-op Sequence",
    mode: { kind: "direct" },
  },
  {
    id: "MECH",
    title: "Mechanical Engineering",
    subtitle: "Fall Entry Co-op Sequence",
    mode: { kind: "direct" },
  },
  {
    id: "SOEN",
    title: "Software Engineering",
    subtitle: "General & Co-op Sequence",
    mode: { kind: "direct" },
  },
  {
    id: "COMP",
    title: "Computer Science",
    subtitle: "General & Co-op Sequence",
    mode: { kind: "direct" },
  },
];
