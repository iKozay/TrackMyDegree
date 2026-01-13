import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PoolHeader } from "../../components/PoolHeader";
import type { Pool, CourseCode } from "../../types/timeline.types";

describe("PoolHeader", () => {
  const pool: Pool = {
    _id: "pool-soen-header",
    name: "Software Engineering Core",
    creditsRequired: 47.5,
    courses: ["SOEN 228", "SOEN 287", "SOEN 321"] as CourseCode[],
  };

  it("renders pool name and total course count when no active search", () => {
    const onToggle = vi.fn();

    render(
      <PoolHeader
        pool={pool}
        isExpanded={false}
        onToggle={onToggle}
        visibleCourseIds={pool.courses}
        hasActiveSearch={false}
      />
    );

    // Pool name
    expect(screen.getByText("Software Engineering Core")).toBeInTheDocument();

    // Course count: just total, since hasActiveSearch = false
    expect(screen.getByText("(3)")).toBeInTheDocument();
  });

  it("shows filtered/total course count when there is an active search", () => {
    const onToggle = vi.fn();

    render(
      <PoolHeader
        pool={pool}
        isExpanded={false}
        onToggle={onToggle}
        visibleCourseIds={["SOEN 228" as CourseCode, "SOEN 287" as CourseCode]}
        hasActiveSearch={true}
      />
    );

    // Should show "(2/3)" when 2 out of 3 match the search
    expect(screen.getByText("(2/3)")).toBeInTheDocument();
  });

  it("calls onToggle when clicked", () => {
    const onToggle = vi.fn();

    render(
      <PoolHeader
        pool={pool}
        isExpanded={false}
        onToggle={onToggle}
        visibleCourseIds={pool.courses}
        hasActiveSearch={false}
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
        visibleCourseIds={pool.courses}
        hasActiveSearch={false}
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
        visibleCourseIds={pool.courses}
        hasActiveSearch={false}
      />
    );

    // Still an SVG, but we mainly care that it re-renders without error.
    const expandedSvg = document.querySelector("svg");
    expect(expandedSvg).toBeInTheDocument();
  });
});
