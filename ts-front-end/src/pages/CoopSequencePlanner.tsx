import { useMemo, useState } from "react";
import type { GeneratedSequence, ProgramId, Season } from "../types/coopSequencePlannerTypes";
import { ProgramGrid } from "../components/ProgramGrid";
import { SequenceView } from "../components/SequenceView";
import { ProgramChoiceModal } from "../components/ProgramChoiceModal";
import { COOP_PROGRAMS } from "../mock/coopPrograms";
import { SOFTWARE_ENGINEERING_TEMPLATE } from "../mock/cspSoftwareEngineering";
import { AEROSPACE_OPTION_A_TEMPLATE } from "../mock/cspAerospaceOptionA";
import { AEROSPACE_OPTION_B_TEMPLATE } from "../mock/cspAerospaceOptionB";
import { AEROSPACE_OPTION_C_TEMPLATE } from "../mock/cspAerospaceOptionC";
import { CHEMICAL_ENG_WINTER_ENTRY_TEMPLATE } from "../mock/cspChemicalEngWinter";
import { CHEMICAL_ENG_FALL_ENTRY_TEMPLATE } from "../mock/cspChemicalEngFall";
import { BUILDING_ENGINEERING_TEMPLATE } from "../mock/cspBuildingEngineering";
import { CIVIL_ENGINEERING_TEMPLATE } from "../mock/cspCivilEngineering";
import { COMPUTER_ENGINEERING_TEMPLATE } from "../mock/cspComputerEngineering";
import { ELECTRICAL_ENGINEERING_TEMPLATE } from "../mock/cspElectricalEngineering";
import { INDUSTRIAL_ENGINEERING_TEMPLATE } from "../mock/cspIndustrialEngineering";
import { MECHANICAL_ENGINEERING_TEMPLATE } from "../mock/cspMechanicalEngineering";
import { COMPUTER_SCIENCE_TEMPLATE } from "../mock/cspComputerScience";
import { generateFromTemplate } from "../utils/cspGenerateSequence";
import "../styles/coopSequencePlanner.css";

function templateFor(programId: ProgramId, option?: string, entry?: Season) {
  switch (programId) {
    case "SOEN":
      return SOFTWARE_ENGINEERING_TEMPLATE;
    case "AERO":
      if (option === "Option A - Aerodynamics and Propulsion") return AEROSPACE_OPTION_A_TEMPLATE;
      if (option === "Option B - Structures and Materials") return AEROSPACE_OPTION_B_TEMPLATE;
      if (option === "Option C - Avionics & Aerospace Systems") return AEROSPACE_OPTION_C_TEMPLATE;
      return AEROSPACE_OPTION_A_TEMPLATE;
    case "CHEM":
      if (entry === "Winter") return CHEMICAL_ENG_WINTER_ENTRY_TEMPLATE;
      if (entry === "Fall") return CHEMICAL_ENG_FALL_ENTRY_TEMPLATE;
      return AEROSPACE_OPTION_A_TEMPLATE;
    case "BLDG":
      return BUILDING_ENGINEERING_TEMPLATE;
    case "CIVI":
      return CIVIL_ENGINEERING_TEMPLATE;
    case "COEN":
      return COMPUTER_ENGINEERING_TEMPLATE;
    case "ELEC":
      return ELECTRICAL_ENGINEERING_TEMPLATE;
    case "COMP":
      return COMPUTER_SCIENCE_TEMPLATE;
    case "INDU":
      return INDUSTRIAL_ENGINEERING_TEMPLATE;
    case "MECH":
      return MECHANICAL_ENGINEERING_TEMPLATE;
    default:
      return SOFTWARE_ENGINEERING_TEMPLATE; // placeholder
  }
}

export default function CoopSequencePlannerPage() {
  const [sequence, setSequence] = useState<GeneratedSequence | null>(null);

  // For programs that require selection
  const [pendingProgramId, setPendingProgramId] = useState<ProgramId | null>(null);

  const pendingConfig = useMemo(() => {
    if (!pendingProgramId) return null;
    return COOP_PROGRAMS.find((p) => p.id === pendingProgramId) ?? null;
  }, [pendingProgramId]);

  const onSelectProgram = (programId: ProgramId) => {
    const config = COOP_PROGRAMS.find((p) => p.id === programId);

    if (config && config.mode.kind !== "direct") {
      setPendingProgramId(programId);
      return;
    }

    const template = templateFor(programId);
    const generated = generateFromTemplate(template, "Fall", 2026);
    setSequence(generated);
  };

  const closeModal = () => setPendingProgramId(null);

  const handlePick = (payload: { option?: string; entrySeason?: Season }) => {
    if (!pendingProgramId) return;

    const template = templateFor(pendingProgramId, payload.option, payload.entrySeason);
    const startSeason: Season = payload.entrySeason ?? "Fall";
    const generated = generateFromTemplate(template, startSeason, 2026);

    setSequence(generated);
    setPendingProgramId(null);
  };

  if (!sequence) {
    return (
      <>
        <ProgramGrid onSelectProgram={onSelectProgram} />

        <ProgramChoiceModal
          open={Boolean(pendingConfig && pendingConfig.mode.kind !== "direct")}
          programTitle={pendingConfig?.title ?? ""}
          mode={pendingConfig?.mode as any}
          onClose={closeModal}
          onPick={handlePick}
        />
      </>
    );
  }

  return (
    <SequenceView
      sequence={sequence}
      onBackToPrograms={() => setSequence(null)}
      onUpdateSequence={setSequence}
      onClearAll={() => setSequence(null)}
    />
  );
}
