import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProgramGrid } from "../../components/ProgramGrid";

describe("ProgramGrid", () => {
  it("renders program cards and calls onSelectProgram with correct id", () => {
    const onSelectProgram = vi.fn();
    render(<ProgramGrid onSelectProgram={onSelectProgram} />);

    // Header present
    expect(screen.getByText(/Co-op Sequence Planner/i)).toBeInTheDocument();

    // Click Software Engineering
    fireEvent.click(screen.getByRole("button", { name: /Software Engineering/i }));
    expect(onSelectProgram).toHaveBeenCalledWith("SOEN");

    // Click Building Engineering
    fireEvent.click(screen.getByRole("button", { name: /Building Engineering/i }));
    expect(onSelectProgram).toHaveBeenCalledWith("BLDG");
  });
});
