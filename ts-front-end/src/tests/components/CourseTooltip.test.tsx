import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CourseTooltip } from "../../components/CourseTooltip";

describe("CourseTooltip", () => {
  const mockOnClose = vi.fn();

  const defaultProps = {
    section: "completed" as const,
    takenCourses: ["COMP 248", "COMP 249", "SOEN 228"],
    remainingCourses: ["MATH 203", "MATH 204", "MATH 205"],
    creditsTaken: 9,
    creditsRequired: 18,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render completed section with correct title, credits and courses", () => {
    render(<CourseTooltip {...defaultProps} />);

    expect(screen.getByText(/Completed: 9 credits/i)).toBeInTheDocument();
    expect(screen.getByText("COMP 248")).toBeInTheDocument();
    expect(screen.getByText("COMP 249")).toBeInTheDocument();
    expect(screen.getByText("SOEN 228")).toBeInTheDocument();
  });

  it("should render remaining section with correct title, credits and courses", () => {
    render(<CourseTooltip {...defaultProps} section="remaining" />);

    expect(screen.getByText(/Remaining: 9 credits/i)).toBeInTheDocument();
    expect(screen.getByText("MATH 203")).toBeInTheDocument();
    expect(screen.getByText("MATH 204")).toBeInTheDocument();
    expect(screen.getByText("MATH 205")).toBeInTheDocument();
  });

  it("should call onClose when close button is clicked", () => {
    render(<CourseTooltip {...defaultProps} />);

    const closeButton = screen.getByRole("button");
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("should render tooltip container", () => {
    const { container } = render(<CourseTooltip {...defaultProps} />);

    const tooltip = container.querySelector(".insights-course-tooltip");
    expect(tooltip).toBeInTheDocument();
  });

  it("should limit remaining courses to 20 items", () => {
    const manyRemainingCourses = Array.from({ length: 25 }, (_, i) => `COURSE ${i + 1}`);
    
    render(
      <CourseTooltip
        {...defaultProps}
        section="remaining"
        remainingCourses={manyRemainingCourses}
      />
    );

    expect(screen.getByText("COURSE 1")).toBeInTheDocument();
    expect(screen.getByText("COURSE 20")).toBeInTheDocument();    
    expect(screen.queryByText("COURSE 21")).not.toBeInTheDocument();
    expect(screen.getByText("+5 more")).toBeInTheDocument();
  });
});
