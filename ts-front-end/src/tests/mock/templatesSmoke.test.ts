import { describe, it, expect } from "vitest";

import { SOFTWARE_ENGINEERING_TEMPLATE } from "../../mock/cspSoftwareEngineering";
import { AEROSPACE_OPTION_A_TEMPLATE } from "../../mock/cspAerospaceOptionA";
import { AEROSPACE_OPTION_B_TEMPLATE } from "../../mock/cspAerospaceOptionB";
import { AEROSPACE_OPTION_C_TEMPLATE } from "../../mock/cspAerospaceOptionC";
import { BUILDING_ENGINEERING_TEMPLATE } from "../../mock/cspBuildingEngineering";
import { CIVIL_ENGINEERING_TEMPLATE } from "../../mock/cspCivilEngineering";
import { CHEMICAL_ENG_FALL_ENTRY_TEMPLATE } from "../../mock/cspChemicalEngFall";
import { CHEMICAL_ENG_WINTER_ENTRY_TEMPLATE } from "../../mock/cspChemicalEngWinter";
import { COMPUTER_ENGINEERING_TEMPLATE } from "../../mock/cspComputerEngineering";
import { COMPUTER_SCIENCE_TEMPLATE } from "../../mock/cspComputerScience";
import { ELECTRICAL_ENGINEERING_TEMPLATE } from "../../mock/cspElectricalEngineering";
import { INDUSTRIAL_ENGINEERING_TEMPLATE } from "../../mock/cspIndustrialEngineering";
import { MECHANICAL_ENGINEERING_TEMPLATE } from "../../mock/cspMechanicalEngineering";
import { COOP_PROGRAMS } from "../../mock/coopPrograms";

describe("Mock templates + COOP_PROGRAMS smoke", () => {
  it("exports templates with required fields", () => {
    const templates = [
      SOFTWARE_ENGINEERING_TEMPLATE,
      AEROSPACE_OPTION_A_TEMPLATE,
      AEROSPACE_OPTION_B_TEMPLATE,
      AEROSPACE_OPTION_C_TEMPLATE,
      BUILDING_ENGINEERING_TEMPLATE,
      CIVIL_ENGINEERING_TEMPLATE,
      CHEMICAL_ENG_FALL_ENTRY_TEMPLATE,
      CHEMICAL_ENG_WINTER_ENTRY_TEMPLATE,
      COMPUTER_ENGINEERING_TEMPLATE,
      COMPUTER_SCIENCE_TEMPLATE,
      ELECTRICAL_ENGINEERING_TEMPLATE,
      INDUSTRIAL_ENGINEERING_TEMPLATE,
      MECHANICAL_ENGINEERING_TEMPLATE,
    ];

    for (const t of templates) {
      expect(t).toHaveProperty("id");
      expect(t).toHaveProperty("programId");
      expect(t).toHaveProperty("programName");
      expect(Array.isArray(t.terms)).toBe(true);
      expect(t.terms.length).toBeGreaterThan(0);
    }
  });

  it("COOP_PROGRAMS lists supported program configs", () => {
    expect(COOP_PROGRAMS.length).toBeGreaterThanOrEqual(10);
    expect(COOP_PROGRAMS.some((p) => p.id === "AERO")).toBe(true);
    expect(COOP_PROGRAMS.some((p) => p.id === "CHEM")).toBe(true);
    expect(COOP_PROGRAMS.some((p) => p.id === "SOEN")).toBe(true);
  });
});
