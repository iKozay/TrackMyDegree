import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SaveTimelineModal } from "../../components/SaveTimelineModal";

describe("SaveTimelineModal (content)", () => {
  const mockOnSave = vi.fn();
  const mockOnClose = vi.fn();

  const defaultProps = {
    timelineName: "My Timeline",
    onSave: mockOnSave,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders title and buttons", () => {
    render(<SaveTimelineModal {...defaultProps} />);

    expect(screen.getByText("Name Your Timeline")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Save")).toBeInTheDocument();
  });

  it("displays input with initial timeline name", () => {
    render(<SaveTimelineModal {...defaultProps} />);

    const input = screen.getByPlaceholderText(
      "Timeline name",
    ) as HTMLInputElement;
    expect(input.value).toBe("My Timeline");
  });

  it("updates input value when typing", () => {
    render(<SaveTimelineModal {...defaultProps} />);

    const input = screen.getByPlaceholderText(
      "Timeline name",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "New Timeline Name" } });

    expect(input.value).toBe("New Timeline Name");
  });

  it("calls onSave with trimmed name and calls onClose", () => {
    render(<SaveTimelineModal {...defaultProps} />);

    const input = screen.getByPlaceholderText("Timeline name");
    fireEvent.change(input, { target: { value: "Updated Timeline  " } });

    fireEvent.click(screen.getByText("Save"));

    expect(mockOnSave).toHaveBeenCalledWith("Updated Timeline");
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Cancel is clicked", () => {
    render(<SaveTimelineModal {...defaultProps} />);

    fireEvent.click(screen.getByText("Cancel"));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnSave).not.toHaveBeenCalled();
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
});
