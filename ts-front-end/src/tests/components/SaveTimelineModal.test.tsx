import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SaveTimelineModal } from "../../components/SaveTimelineModal";

describe("SaveTimelineModal", () => {
  const mockOnSave = vi.fn();
  const mockOnClose = vi.fn();

  const defaultProps = {
    open: true,
    timelineName: "My Timeline",
    onSave: mockOnSave,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not render when open is false", () => {
    render(<SaveTimelineModal {...defaultProps} open={false} />);

    expect(screen.queryByText("Name Your Timeline")).not.toBeInTheDocument();
  });

  it("should render modal when open is true", () => {
    render(<SaveTimelineModal {...defaultProps} />);

    expect(screen.getByText("Name Your Timeline")).toBeInTheDocument();

    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Save")).toBeInTheDocument();
  });

  it("should display input with initial timeline name", () => {
    render(<SaveTimelineModal {...defaultProps} />);

    const input = screen.getByPlaceholderText(
      "Timeline name"
    ) as HTMLInputElement;

    expect(input.value).toBe("My Timeline");
  });

  it("should update input value when typing", () => {
    render(<SaveTimelineModal {...defaultProps} />);

    const input = screen.getByPlaceholderText(
      "Timeline name"
    ) as HTMLInputElement;

    fireEvent.change(input, {
      target: { value: "New Timeline Name" },
    });

    expect(input.value).toBe("New Timeline Name");
  });

  it("should call onSave with trimmed timeline name and close modal", () => {
    render(<SaveTimelineModal {...defaultProps} />);

    const input = screen.getByPlaceholderText("Timeline name");
    fireEvent.change(input, {
      target: { value: "Updated Timeline  " },
    });

    fireEvent.click(screen.getByText("Save"));

    expect(mockOnSave).toHaveBeenCalledWith("Updated Timeline");
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("should call onClose when Cancel button is clicked", () => {
    render(<SaveTimelineModal {...defaultProps} />);

    fireEvent.click(screen.getByText("Cancel"));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it("should call onClose when backdrop is clicked", () => {
    render(<SaveTimelineModal {...defaultProps} />);

    const title = screen.getByText("Name Your Timeline");
    const backdrop = title.closest(".modal-backdrop");

    expect(backdrop).toBeTruthy();

    fireEvent.click(backdrop!);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("initializes with trimmed timeline name when provided", () => {
      render(
          <SaveTimelineModal
              open={true}
              timelineName={"   My Timeline   "}
              onSave={vi.fn()}
              onClose={vi.fn()}
          />
      );

      const input = screen.getByPlaceholderText("Timeline name") as HTMLInputElement;
      expect(input.value).toBe("My Timeline");
  });
  it("should update input when timelineName prop changes after mount", () => {
      const { rerender } = render(<SaveTimelineModal {...defaultProps} timelineName="Initial" />);

      const input = screen.getByPlaceholderText("Timeline name") as HTMLInputElement;
      expect(input.value).toBe("Initial");

      rerender(<SaveTimelineModal {...defaultProps} timelineName="Updated" open={true} />);

      expect(input.value).toBe("Updated");
  });
});
