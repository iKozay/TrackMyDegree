import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

// Mock SequenceView so this test focuses on page flow + template selection
vi.mock("../../components/SequenceView", () => ({
  SequenceView: ({ sequence, onBackToPrograms }: any) => (
    <div>
      <div data-testid="sequence-view">
        {sequence.programId}:{sequence.templateId}:{sequence.programName}
      </div>
      <button onClick={onBackToPrograms}>Back</button>
    </div>
  ),
}));

import CoopSequencePlannerPage from "../../pages/CoopSequencePlanner";

describe("CoopSequencePlannerPage", () => {
  it("direct program: selecting SOEN generates and shows SequenceView", () => {
    render(<CoopSequencePlannerPage />);

    fireEvent.click(screen.getByRole("button", { name: /Software Engineering/i }));

    expect(screen.getByTestId("sequence-view")).toHaveTextContent("SOEN:SOEN_GENERAL_COOP");
  });

  it("option program: Aerospace opens modal and selecting Option B generates correct template", () => {
    render(<CoopSequencePlannerPage />);

    fireEvent.click(screen.getByRole("button", { name: /Aerospace Engineering/i }));

    // modal opens
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Option B/i }));

    expect(screen.getByTestId("sequence-view")).toHaveTextContent("AERO:AERO_OPTION_B_COOP");
  });

  it("entry program: Chemical opens modal and selecting Winter Entry generates correct template", () => {
    render(<CoopSequencePlannerPage />);

    fireEvent.click(screen.getByRole("button", { name: /Chemical Engineering/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /Winter\s*Entry/i }));

    expect(screen.getByTestId("sequence-view")).toHaveTextContent("CHEM:CHME_WINTER_ENTRY_COOP");
  });

  it("can go back to program grid from SequenceView", () => {
    render(<CoopSequencePlannerPage />);

    fireEvent.click(screen.getByRole("button", { name: /Software Engineering/i }));
    expect(screen.getByTestId("sequence-view")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Back$/i }));
    expect(screen.getByText(/Co-op Sequence Planner/i)).toBeInTheDocument();
  });
});
