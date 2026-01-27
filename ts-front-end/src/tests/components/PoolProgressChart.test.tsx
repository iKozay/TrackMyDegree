import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PoolProgressChart } from "../../components/PoolProgressChart";

vi.mock("../../components/CourseTooltip", () => ({
  CourseTooltip: ({ section, onClose }: { section: string; onClose: () => void }) => (
    <div data-testid="course-tooltip">
      <span>Tooltip for {section}</span>
      <button onClick={onClose}>Close Tooltip</button>
    </div>
  ),
}));

describe("PoolProgressChart", () => {
  const defaultProps = {
    poolName: "Computer Science Core",
    creditsRequired: 30,
    creditsTaken: 15,
    takenCourses: ["COMP 248", "COMP 249", "SOEN 228"],
    remainingCourses: ["MATH 203", "MATH 204", "MATH 205"],
  };

  it("should render pool name, percentage, credits, and SVG chart correctly", () => {
    const { container } = render(<PoolProgressChart {...defaultProps} creditsTaken={10} creditsRequired={30} />);

    // Pool name, percentage (10/30 = 33.33% -> rounds to 33%), credits
    expect(screen.getByText("Computer Science Core")).toBeInTheDocument();
    expect(screen.getByText("33%")).toBeInTheDocument();
    expect(screen.getByText("10 / 30 credits")).toBeInTheDocument();

    // SVG elements
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    const circles = container.querySelectorAll("circle");
    expect(circles).toHaveLength(2);

    // No tooltip initially
    expect(screen.queryByTestId("course-tooltip")).not.toBeInTheDocument();
  });

  it("should handle tooltip interactions for completed and remaining sections", () => {
    render(<PoolProgressChart {...defaultProps} />);

    // Show tooltip on completed section hover
    const progressCircle = document.querySelector(".insights-pool-progress-circle");
    if (progressCircle) {
      fireEvent.mouseEnter(progressCircle);
      expect(screen.getByTestId("course-tooltip")).toBeInTheDocument();
      expect(screen.getByText("Tooltip for completed")).toBeInTheDocument();

      // Close tooltip
      const closeButton = screen.getByText("Close Tooltip");
      fireEvent.click(closeButton);
      expect(screen.queryByTestId("course-tooltip")).not.toBeInTheDocument();
    }

    // Show tooltip on remaining section hover
    const backgroundCircle = document.querySelector(".insights-pool-background-circle");
    if (backgroundCircle) {
      fireEvent.mouseEnter(backgroundCircle);
      expect(screen.getByTestId("course-tooltip")).toBeInTheDocument();
      expect(screen.getByText("Tooltip for remaining")).toBeInTheDocument();
    }
  });

  it("should handle edge cases: 0%, 100%, and division by zero", () => {
    const { rerender } = render(<PoolProgressChart {...defaultProps} creditsTaken={0} />);
    expect(screen.getByText("0%")).toBeInTheDocument();

    rerender(<PoolProgressChart {...defaultProps} creditsTaken={30} creditsRequired={30} />);
    expect(screen.getByText("100%")).toBeInTheDocument();

    rerender(<PoolProgressChart {...defaultProps} creditsTaken={0} creditsRequired={0} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });
});
