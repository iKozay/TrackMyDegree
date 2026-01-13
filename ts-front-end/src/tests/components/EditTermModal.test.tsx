import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EditTermModal } from "../../components/EditTermModal";
import type { SequenceTerm } from "../../types/coopSequencePlannerTypes";

describe("EditTermModal", () => {
  const academicTerm: SequenceTerm = {
    id: "t1",
    termNumber: 1,
    season: "Fall",
    year: 2026,
    type: "Academic",
    courses: ["COMP 248"],
  };

  it("returns null when closed or term is null", () => {
    const { container } = render(
      <EditTermModal open={false} term={academicTerm} onClose={() => {}} onSave={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("edits academic term: can add course and saves trimmed list", () => {
    const onSave = vi.fn();

    render(<EditTermModal open term={academicTerm} onClose={() => {}} onSave={onSave} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Edit Term - Fall 2026/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Add Course/i }));

    const inputs = screen.getAllByPlaceholderText(/Course code/i);
    expect(inputs.length).toBe(2);

    fireEvent.change(inputs[1], { target: { value: "  SOEN 228  " } });

    fireEvent.click(screen.getByRole("button", { name: /Update Term/i }));

    expect(onSave).toHaveBeenCalledWith({
      ...academicTerm,
      type: "Academic",
      courses: ["COMP 248", "SOEN 228"],
    });
  });

  it("switches to Co-op and saves coopLabel (default if empty)", () => {
    const onSave = vi.fn();
    render(<EditTermModal open term={academicTerm} onClose={() => {}} onSave={onSave} />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Co-op" } });

    // leave label empty -> default "Co-op Work Term"
    fireEvent.click(screen.getByRole("button", { name: /Update Term/i }));

    expect(onSave).toHaveBeenCalledWith({
      ...academicTerm,
      type: "Co-op",
      coopLabel: "Co-op Work Term",
    });
  });
});
