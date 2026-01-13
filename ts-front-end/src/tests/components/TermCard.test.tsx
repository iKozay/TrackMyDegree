import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TermCard, AddTermCard } from "../../components/TermCard";

describe("TermCard", () => {
  it("renders an academic term with courses and calls onClick", () => {
    const onClick = vi.fn();
    render(
      <TermCard
        onClick={onClick}
        term={{
          id: "t1",
          termNumber: 1,
          season: "Fall",
          year: 2026,
          type: "Academic",
          courses: ["COMP 248", "SOEN 228"],
        }}
      />
    );

    expect(screen.getByText(/Fall 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/Term 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Academic/i)).toBeInTheDocument();
    expect(screen.getByText("COMP 248")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders a co-op term with coop label", () => {
    render(
      <TermCard
        onClick={() => {}}
        term={{
          id: "t2",
          termNumber: 2,
          season: "Winter",
          year: 2027,
          type: "Co-op",
          coopLabel: "Work Term 1",
        }}
      />
    );

    expect(screen.getByText(/Co-op/i)).toBeInTheDocument();
    expect(screen.getByText(/Work Term 1/i)).toBeInTheDocument();
  });

  it("AddTermCard calls onAdd", () => {
    const onAdd = vi.fn();
    render(<AddTermCard onAdd={onAdd} />);
    fireEvent.click(screen.getByRole("button", { name: /Add Term/i }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});
