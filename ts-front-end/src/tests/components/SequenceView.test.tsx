import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SequenceView } from "../../components/SequenceView";

vi.mock("../../utils/cspDownload", () => ({
  downloadJson: vi.fn(),
}));

import { downloadJson } from "../../utils/cspDownload";

describe("SequenceView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  const baseSequence: any = {
    programId: "SOEN",
    programName: "Software Engineering",
    templateId: "SOEN_GENERAL_COOP",
    validated: false,
    defaultTerms: [
      { id: "d1", termNumber: 1, season: "Fall", year: 2026, type: "Academic", courses: ["COMP 248"] },
    ],
    currentTerms: [
      { id: "c1", termNumber: 1, season: "Fall", year: 2026, type: "Academic", courses: ["COMP 248"] },
    ],
  };

  it("validates (stub): clicking Validate calls onUpdateSequence with validated=true", () => {
    const onUpdateSequence = vi.fn();
    render(
      <SequenceView
        sequence={baseSequence}
        onBackToPrograms={() => {}}
        onUpdateSequence={onUpdateSequence}
        onClearAll={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Validate/i }));
    expect(onUpdateSequence).toHaveBeenCalledWith(expect.objectContaining({ validated: true }));
  });

  it("download: if not validated, shows prompt; Validate First triggers onUpdateSequence and downloadJson", () => {
    const onUpdateSequence = vi.fn();
    render(
      <SequenceView
        sequence={baseSequence}
        onBackToPrograms={() => {}}
        onUpdateSequence={onUpdateSequence}
        onClearAll={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Download/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Validate First/i }));

    expect(onUpdateSequence).toHaveBeenCalledWith(expect.objectContaining({ validated: true }));
    expect(downloadJson).toHaveBeenCalledTimes(1);
    expect(downloadJson).toHaveBeenCalledWith(
      "coop-sequence-SOEN.json",
      expect.objectContaining({ templateId: "SOEN_GENERAL_COOP" })
    );
  });

  it("reset to default uses ConfirmModal and calls onUpdateSequence with defaultTerms clone and validated=false", () => {
    const onUpdateSequence = vi.fn();
    const seq = {
      ...baseSequence,
      validated: true,
      currentTerms: [
        { id: "c1", termNumber: 1, season: "Fall", year: 2026, type: "Academic", courses: ["CHANGED"] },
      ],
    };

    render(
      <SequenceView
        sequence={seq}
        onBackToPrograms={() => {}}
        onUpdateSequence={onUpdateSequence}
        onClearAll={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Reset to Default/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Reset$/i }));

    expect(onUpdateSequence).toHaveBeenCalledWith(
      expect.objectContaining({
        validated: false,
        currentTerms: expect.arrayContaining([expect.objectContaining({ courses: ["COMP 248"] })]),
      })
    );
  });

  it("clear opens confirm and calls onClearAll after confirming", () => {
    const onClearAll = vi.fn();

    render(
        <SequenceView
        sequence={baseSequence}
        onBackToPrograms={() => {}}
        onUpdateSequence={() => {}}
        onClearAll={onClearAll}
        />
    );

    // First Clear = toolbar button
    fireEvent.click(screen.getAllByRole("button", { name: /^Clear$/i })[0]);

    // Second Clear = modal confirm button
    fireEvent.click(screen.getAllByRole("button", { name: /^Clear$/i })[1]);

    expect(onClearAll).toHaveBeenCalledTimes(1);
 });

  it("save: alerts user if not logged in", () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(
      <SequenceView
        sequence={baseSequence}
        onBackToPrograms={() => {}}
        onUpdateSequence={() => {}}
        onClearAll={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Save/i }));
    expect(alertSpy).toHaveBeenCalledWith("Please log in to save your sequence.");
  });

  it("save: if logged in, shows stub saved alert", () => {
    localStorage.setItem("authToken", "x");
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(
      <SequenceView
        sequence={baseSequence}
        onBackToPrograms={() => {}}
        onUpdateSequence={() => {}}
        onClearAll={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Save/i }));
    expect(alertSpy).toHaveBeenCalledWith(expect.stringMatching(/Saved \(stub\)/i));
  });
});
