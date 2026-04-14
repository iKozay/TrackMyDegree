import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OverallProgressBar } from "../../components/OverallProgressBar";

describe("OverallProgressBar", () => {
  it("should render correctly with percentage calculation, credits display, and progress bar styling", () => {
    const { container } = render(<OverallProgressBar totalTaken={45} totalRequired={120} />);

    // Title, percentage (45/120 = 37.5% -> rounds to 38%), credits summary, and bar width
    expect(screen.getByText("Overall Progress")).toBeInTheDocument();
    expect(screen.getByText("38%")).toBeInTheDocument();
    expect(screen.getByText("45 credits completed / 120 credits total")).toBeInTheDocument();
    
    const progressBar = container.querySelector(".insights-overall-progress-bar");
    expect(progressBar).toHaveStyle({ width: "38%" });
  });

  it("should handle edge cases: 0%, 100%, and division by zero", () => {
    // 0% progress
    const { rerender, container: container1 } = render(
      <OverallProgressBar totalTaken={0} totalRequired={120} />
    );
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(container1.querySelector(".insights-overall-progress-bar")).toHaveStyle({ width: "0%" });

    // 100% progress
    rerender(<OverallProgressBar totalTaken={120} totalRequired={120} />);
    expect(screen.getByText("100%")).toBeInTheDocument();

    // Division by zero
    rerender(<OverallProgressBar totalTaken={0} totalRequired={0} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByText("0 credits completed / 0 credits total")).toBeInTheDocument();
  });
});
