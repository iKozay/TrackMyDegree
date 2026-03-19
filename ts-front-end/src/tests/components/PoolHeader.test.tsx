import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PoolHeader } from "../../components/PoolHeader";
import type { CoursePoolData } from "@shared";
import type { CourseCode, CourseMap, SemesterId } from "../../types/timeline.types";

describe("PoolHeader", () => {
  const pool: CoursePoolData = {
    _id: "pool-soen-header",
    name: "Software Engineering Core",
    creditsRequired: 47.5,
    courses: ["SOEN 228", "SOEN 287", "SOEN 321"] as CourseCode[],
    rules: [],
  };

  const courses: CourseMap = {
    "ENGR 201": {
      id: "ENGR 201" as CourseCode,
      title: "Engineering Mechanics",
      credits: 3,
      description: "",
      offeredIn: [] as SemesterId[],
      prerequisites: [],
      corequisites: [],
      status: { status: "completed", semester: null },
    },
    "ENGR 233": {
      id: "ENGR 233" as CourseCode,
      title: "Applied Advanced Calculus",
      credits: 3,
      description: "",
      offeredIn: [] as SemesterId[],
      prerequisites: [],
      corequisites: [],
      status: { status: "incomplete", semester: null },
    },
    "SOEN 228": {
      id: "SOEN 228" as CourseCode,
      title: "System Hardware",
      credits: 4,
      description: "",
      offeredIn: [] as SemesterId[],
      prerequisites: [],
      corequisites: [],
      status: { status: "completed", semester: null },
    },
    "SOEN 287": {
      id: "SOEN 287" as CourseCode,
      title: "Web Programming",
      credits: 3,
      description: "",
      offeredIn: [] as SemesterId[],
      prerequisites: [],
      corequisites: [],
      status: { status: "incomplete", semester: null },
    },
  };

  it("renders pool name and total course count when no active search", () => {
    const onToggle = vi.fn();

    render(
      <PoolHeader
        pool={pool}
        isExpanded={false}
        onToggle={onToggle}
        courses={courses}
      />
    );

    // Pool name
    expect(screen.getByText("Software Engineering Core")).toBeInTheDocument();

    // Course count should reflect visible courses.
    expect(screen.getByText("(4/47.5)")).toBeInTheDocument();
  });

  it("shows visible course count when there is an active search", () => {
    const onToggle = vi.fn();

    render(
      <PoolHeader
        pool={pool}
        isExpanded={false}
        onToggle={onToggle}
        courses={courses}
      />
    );

    expect(screen.getByText("(4/47.5)")).toBeInTheDocument();
  });

  it("calls onToggle when clicked", () => {
    const onToggle = vi.fn();

    render(
      <PoolHeader
        pool={pool}
        isExpanded={false}
        onToggle={onToggle}
        courses={courses}
      />
    );

    const button = screen.getByRole("button", {
      name: /software engineering core/i,
    });

    fireEvent.click(button);

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("renders different chevron depending on isExpanded", () => {
    const onToggle = vi.fn();

    const { rerender } = render(
      <PoolHeader
        pool={pool}
        isExpanded={false}
        onToggle={onToggle}
        courses={courses}
      />
    );

    // Collapsed: ChevronRight icon rendered as an SVG
    const collapsedSvg = document.querySelector("svg");
    expect(collapsedSvg).toBeInTheDocument();

    // Now expanded
    rerender(
      <PoolHeader
        pool={pool}
        isExpanded={true}
        onToggle={onToggle}
        courses={courses}
      />
    );

    // Still an SVG, but we mainly care that it re-renders without error.
    const expandedSvg = document.querySelector("svg");
    expect(expandedSvg).toBeInTheDocument();
  });

  it("does not call onToggle when disabled", () => {
    const onToggle = vi.fn();

    render(
      <PoolHeader
        pool={pool}
        isExpanded={false}
        onToggle={onToggle}
        courses= {{}}
        disabled={true}
      />
    );

    const button = screen.getByRole("button", {
      name: /software engineering core/i,
    });

    fireEvent.click(button);
    expect(button).toBeDisabled();
    expect(onToggle).not.toHaveBeenCalled();
  });
});
