import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TimelineHeader } from "../../components/TimelineHeader";
import * as authHook from "../../hooks/useAuth";
import type { AuthContextValue } from "../../types/auth.types";
import { toast } from "react-toastify";

vi.mock("../../utils/timelineUtils", async () => {
  const actual = await vi.importActual<
    typeof import("../../utils/timelineUtils")
  >("../../utils/timelineUtils");
  return {
    ...actual,
    downloadTimelinePdf: vi.fn(),
  };
});

import { downloadTimelinePdf } from "../../utils/timelineUtils";

vi.mock("../../hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("TimelineHeader", () => {
  const baseProps = {
    canUndo: false,
    canRedo: false,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    earnedCredits: 30,
    totalCredits: 120,
    onOpenModal: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(downloadTimelinePdf).mockReset();
    const authValue: AuthContextValue = {
      isAuthenticated: true,
      user: {
        id: "u1",
        email: "test@test.com",
        name: "Test User",
        role: "student",
      },
      loading: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
    };
    vi.mocked(authHook.useAuth).mockReturnValue(authValue);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    Object.assign(globalThis.navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
    vi.mocked(toast.success).mockReset();
    vi.mocked(toast.error).mockReset();
  });

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

  it("renders sharing and download buttons", () => {
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

  it("copies URL and shows confirmation when Share is clicked", async () => {
    render(<TimelineHeader {...baseProps} />);

    fireEvent.click(screen.getByRole("button", { name: /share/i }));

    expect(globalThis.navigator.clipboard.writeText).toHaveBeenCalled();
    await vi.waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Timeline link copied to clipboard");
    });
  });

  it("calls downloadTimelinePdf when Download is clicked", () => {
    render(<TimelineHeader {...baseProps} />);

    fireEvent.click(screen.getByRole("button", { name: /download/i }));

    expect(vi.mocked(downloadTimelinePdf)).toHaveBeenCalledTimes(1);
  });

  it("logs when Share fails", async () => {
    vi.mocked(globalThis.navigator.clipboard.writeText).mockRejectedValueOnce(
      new Error("copy failed")
    );
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(<TimelineHeader {...baseProps} />);

    fireEvent.click(screen.getByRole("button", { name: /share/i }));

    // Wait for the promise rejection to propagate
    await vi.waitFor(() => {
      expect(errorSpy).toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith("Could not copy link.");
    });
  });

  it("logs when Download fails", async () => {
    vi.mocked(downloadTimelinePdf).mockRejectedValueOnce(new Error("download failed"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(<TimelineHeader {...baseProps} />);

    fireEvent.click(screen.getByRole("button", { name: /download/i }));

    await Promise.resolve();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("shows Save Data button even when unauthenticated", () => {
    const authValue: AuthContextValue = {
      isAuthenticated: false,
      user: null,
      loading: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
    };
    vi.mocked(authHook.useAuth).mockReturnValue(authValue);

    render(<TimelineHeader {...baseProps} />);

    expect(
      screen.getByRole("button", { name: /save data/i })
    ).toBeInTheDocument();
  });
});
