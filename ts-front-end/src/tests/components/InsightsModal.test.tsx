import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InsightsModal } from "../../components/InsightsModal";
import type { Pool, CourseMap } from "../../types/timeline.types";

vi.mock("../../components/OverallProgressBar", () => ({
  OverallProgressBar: ({ totalTaken, totalRequired }: { totalTaken: number; totalRequired: number }) => (
    <div data-testid="overall-progress-bar">
      Overall: {totalTaken}/{totalRequired}
    </div>
  ),
}));

vi.mock("../../components/PoolProgressChart", () => ({
  PoolProgressChart: ({ poolName, creditsTaken, creditsRequired }: { poolName: string; creditsTaken: number; creditsRequired: number }) => (
    <div data-testid="pool-progress-chart">
      {poolName}: {creditsTaken}/{creditsRequired}
    </div>
  ),
}));

describe("InsightsModal", () => {
  const mockOnClose = vi.fn();

  const mockCourses: CourseMap = {
    "COMP 248": {
      id: "COMP 248",
      title: "OOP I",
      description: "Test",
      credits: 3,
      offeredIN: [],
      prerequisites: [],
      corequisites: [],
      status: { status: "completed", semester: null },
    },
    "COMP 249": {
      id: "COMP 249",
      title: "OOP II",
      description: "Test",
      credits: 3,
      offeredIN: [],
      prerequisites: [],
      corequisites: [],
      status: { status: "planned", semester: null },
    },
    "SOEN 228": {
      id: "SOEN 228",
      title: "System Hardware",
      description: "Test",
      credits: 4,
      offeredIN: [],
      prerequisites: [],
      corequisites: [],
      status: { status: "incomplete", semester: null },
    },
    "MATH 203": {
      id: "MATH 203",
      title: "Calculus I",
      description: "Test",
      credits: 3,
      offeredIN: [],
      prerequisites: [],
      corequisites: [],
      status: { status: "inprogress", semester: null },
    },
  };

  const mockPools: Pool[] = [
    {
      _id: "pool-cs",
      name: "Computer Science Core",
      courses: ["COMP 248", "COMP 249", "SOEN 228"],
      creditsRequired: 30,
    },
    {
      _id: "pool-math",
      name: "Mathematics",
      courses: ["MATH 203"],
      creditsRequired: 12,
    },
  ];

  const defaultProps = {
    open: true,
    pools: mockPools,
    courses: mockCourses,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not render when open is false", () => {
    render(<InsightsModal {...defaultProps} open={false} />);

    expect(screen.queryByText("Progress Insights")).not.toBeInTheDocument();
  });

  it("should render modal when open is true", () => {
    render(<InsightsModal {...defaultProps} />);

    expect(screen.getByText("Progress Insights")).toBeInTheDocument();
  });

  it("should render OverallProgressBar with correct totals", () => {
    render(<InsightsModal {...defaultProps} />);

    // COMP 248 (3) + COMP 249 (3) + MATH 203 (3) = 9 taken
    // Total required = 30 + 12 = 42
    expect(screen.getByText("Overall: 9/42")).toBeInTheDocument();
  });

  it("should render PoolProgressChart for each pool", () => {
    render(<InsightsModal {...defaultProps} />);

    // Computer Science Core: COMP 248 (3) + COMP 249 (3) = 6 taken, 30 required
    expect(screen.getByText("Computer Science Core: 6/30")).toBeInTheDocument();
    
    // Mathematics: MATH 203 (3) = 3 taken, 12 required
    expect(screen.getByText("Mathematics: 3/12")).toBeInTheDocument();
  });

  it("should call onClose when close button is clicked", () => {
    render(<InsightsModal {...defaultProps} />);

    const closeButton = screen.getByRole("button", { name: /close insights modal/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("should filter only active courses (planned, completed, inprogress)", () => {
    render(<InsightsModal {...defaultProps} />);

    // SOEN 228 is incomplete, so it should not be counted
    // Only COMP 248 (completed) + COMP 249 (planned) should count for CS Core
    expect(screen.getByText("Computer Science Core: 6/30")).toBeInTheDocument();
  });

  it("should handle pools with no taken courses", () => {
    const coursesWithoutMath: CourseMap = {
      "COMP 248": mockCourses["COMP 248"],
    };

    render(
      <InsightsModal
        {...defaultProps}
        courses={coursesWithoutMath}
      />
    );

    // Math pool should show 0 taken
    expect(screen.getByText("Mathematics: 0/12")).toBeInTheDocument();
  });

  it("should recalculate when props change", () => {
    const { rerender } = render(<InsightsModal {...defaultProps} />);

    expect(screen.getByText("Overall: 9/42")).toBeInTheDocument();

    const newCourses: CourseMap = {
      ...mockCourses,
      "COMP 248": {
        ...mockCourses["COMP 248"],
        status: { status: "incomplete", semester: null },
      },
    };

    rerender(<InsightsModal {...defaultProps} courses={newCourses} />);

    // Now COMP 248 is not counted, so 3 + 3 = 6 total taken
    expect(screen.getByText("Overall: 6/42")).toBeInTheDocument();
  });
});
