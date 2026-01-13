import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProgramChoiceModal } from "../../components/ProgramChoiceModal";

describe("ProgramChoiceModal", () => {
  it("returns null when closed", () => {
    const { container } = render(
      <ProgramChoiceModal
        open={false}
        programTitle="Aerospace Engineering"
        mode={{ kind: "option", options: ["Option A"] }}
        onClose={() => {}}
        onPick={() => {}}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("option mode: clicking an option calls onPick({ option })", () => {
    const onPick = vi.fn();
    render(
      <ProgramChoiceModal
        open
        programTitle="Aerospace Engineering"
        mode={{ kind: "option", options: ["Option A", "Option B"] }}
        onClose={() => {}}
        onPick={onPick}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Option B/i }));
    expect(onPick).toHaveBeenCalledWith({ option: "Option B" });
  });

  it("entry mode: clicking entry calls onPick({ entrySeason })", () => {
    const onPick = vi.fn();
    render(
      <ProgramChoiceModal
        open
        programTitle="Chemical Engineering"
        mode={{ kind: "entry", entries: ["Fall", "Winter"] }}
        onClose={() => {}}
        onPick={onPick}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Winter Entry/i }));
    expect(onPick).toHaveBeenCalledWith({ entrySeason: "Winter" });
  });

  it("Cancel and Close call onClose", () => {
    const onClose = vi.fn();
    render(
      <ProgramChoiceModal
        open
        programTitle="Chemical Engineering"
        mode={{ kind: "entry", entries: ["Fall"] }}
        onClose={onClose}
        onPick={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /Close/i }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
