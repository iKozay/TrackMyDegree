import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TimelineHeader } from "../../components/TimelineHeader";

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: {
      id: "u1",
      email: "test@test.com",
      fullname: "Test User",
      type: "student",
    },
  }),
}));

describe("TimelineHeader", () => {
  const baseProps = {
    canUndo: false,
    canRedo: false,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    earnedCredits: 30,
    totalCredits: 120,
    onShowInsights: vi.fn(),
    onSave: vi.fn(),
  };

  it("renders credits summary correctly", () => {
    render(<TimelineHeader {...baseProps} />);

    expect(
      screen.getByText(/total credits earned:\s*30\s*\/\s*120/i)
    ).toBeInTheDocument();
  });

  it("disables undo and redo buttons according to props", () => {
    const { rerender } = render(<TimelineHeader {...baseProps} />);

    const undoBtn = screen.getByTitle(/undo last change/i);
    const redoBtn = screen.getByTitle(/redo/i);

    expect(undoBtn).toBeDisabled();
    expect(redoBtn).toBeDisabled();

    rerender(<TimelineHeader {...baseProps} canUndo={true} canRedo={true} />);

    expect(undoBtn).not.toBeDisabled();
    expect(redoBtn).not.toBeDisabled();
  });

  it("calls onUndo and onRedo when the respective buttons are clicked", () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();

    render(
      <TimelineHeader
        {...baseProps}
        canUndo={true}
        canRedo={true}
        onUndo={onUndo}
        onRedo={onRedo}
      />
    );

    const undoBtn = screen.getByTitle(/undo last change/i);
    const redoBtn = screen.getByTitle(/redo/i);

    fireEvent.click(undoBtn);
    fireEvent.click(redoBtn);

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(1);
  });

  it("renders Share and Download buttons", () => {
    render(<TimelineHeader {...baseProps} />);

    expect(screen.getByRole("button", { name: /share/i })).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /download/i })
    ).toBeInTheDocument();
  });

  it("calls onShowInsights when Show Insights is clicked", () => {
    const onOpenModal = vi.fn();

    render(<TimelineHeader {...baseProps} onOpenModal={onOpenModal} />);

    const insightsBtn = screen.getByRole("button", { name: /show insights/i });

    fireEvent.click(insightsBtn);

    expect(onOpenModal).toHaveBeenCalledTimes(1);
    expect(onOpenModal).toHaveBeenCalledWith(true, "insights");
  });
});
