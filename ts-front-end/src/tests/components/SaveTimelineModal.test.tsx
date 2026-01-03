import { describe, it, expect, vi } from "vitest";
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

    expect(screen.queryByText("Save Timeline")).not.toBeInTheDocument();
  });

  it("should render modal when open is true", () => {
    render(<SaveTimelineModal {...defaultProps} />);

    expect(screen.getByText("Save Timeline")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Save")).toBeInTheDocument();
  });

  it("should display input with initial timeline name", () => {
    render(<SaveTimelineModal {...defaultProps} />);

    const input: HTMLInputElement = screen.getByPlaceholderText("Timeline name");
    expect(input.value).toBe("My Timeline");
  });

  it("should update input value when typing", () => {
    render(<SaveTimelineModal {...defaultProps} />);

    const input: HTMLInputElement = screen.getByPlaceholderText("Timeline name");
    fireEvent.change(input, { target: { value: "New Timeline Name" } });

    expect(input.value).toBe("New Timeline Name");
  });

  it("should call onSave with timeline name when Save button is clicked", () => {
    render(<SaveTimelineModal {...defaultProps} />);

    const input = screen.getByPlaceholderText("Timeline name");
    fireEvent.change(input, { target: { value: "Updated Timeline  " } });

    const saveButton = screen.getByText("Save");
    fireEvent.click(saveButton);

    expect(mockOnSave).toHaveBeenCalledWith("Updated Timeline");
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("should call onClose when Cancel button is clicked", () => {
    render(<SaveTimelineModal {...defaultProps} />);

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it("should call onClose when backdrop is clicked", () => {
    render(<SaveTimelineModal {...defaultProps} />);

    const backdrop = screen.getByText("Save Timeline").closest(".modal-backdrop");
    
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    }
  });
});
