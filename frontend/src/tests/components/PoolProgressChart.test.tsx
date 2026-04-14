import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PoolProgressChart } from "../../components/PoolProgressChart";

vi.mock("../../components/CourseTooltip", () => ({
  CourseTooltip: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="course-tooltip">
      <span>Pool detail tooltip</span>
      <button type="button" onClick={onClose}>
        Close Tooltip
      </button>
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
    const { container } = render(
      <PoolProgressChart {...defaultProps} creditsTaken={10} creditsRequired={30} />,
    );

    expect(screen.getByText("Computer Science Core")).toBeInTheDocument();
    expect(screen.getByText("33%")).toBeInTheDocument();
    expect(screen.getByText("10 / 30 credits")).toBeInTheDocument();

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    const circles = container.querySelectorAll("circle");
    expect(circles).toHaveLength(3);

    expect(screen.queryByTestId("course-tooltip")).not.toBeInTheDocument();
  });

  it("should show tooltip when hovering the chart and hide on close or mouse leave", () => {
    const { container } = render(<PoolProgressChart {...defaultProps} />);

    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    fireEvent.mouseEnter(svg!);

    expect(screen.getByTestId("course-tooltip")).toBeInTheDocument();
    expect(screen.getByText("Pool detail tooltip")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Close Tooltip"));
    expect(screen.queryByTestId("course-tooltip")).not.toBeInTheDocument();

    fireEvent.mouseEnter(svg!);
    expect(screen.getByTestId("course-tooltip")).toBeInTheDocument();

    const chartContainer = container.querySelector(
      ".insights-pool-chart-container",
    );
    fireEvent.mouseLeave(chartContainer!);
    expect(screen.queryByTestId("course-tooltip")).not.toBeInTheDocument();
  });

  it("should handle edge cases: 0%, 100%, and division by zero", () => {
    const { rerender } = render(
      <PoolProgressChart {...defaultProps} creditsTaken={0} />,
    );
    expect(screen.getByText("0%")).toBeInTheDocument();

    rerender(
      <PoolProgressChart {...defaultProps} creditsTaken={30} creditsRequired={30} />,
    );
    expect(screen.getByText("100%")).toBeInTheDocument();

    rerender(
      <PoolProgressChart {...defaultProps} creditsTaken={0} creditsRequired={0} />,
    );
    expect(screen.getByText("0%")).toBeInTheDocument();
  });
});
