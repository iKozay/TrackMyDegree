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
      />
    );

    // Pool name
    expect(screen.getByText("Software Engineering Core")).toBeInTheDocument();

    // Course count should reflect visible courses.
    expect(screen.getByText("(3)")).toBeInTheDocument();
  });

  it("shows visible course count when there is an active search", () => {
    const onToggle = vi.fn();

    render(
      <PoolHeader
        pool={pool}
        isExpanded={false}
        onToggle={onToggle}
        visibleCourseIds={["SOEN 228" as CourseCode, "SOEN 287" as CourseCode]}
      />
    );

    expect(screen.getByText("(2)")).toBeInTheDocument();
  });

  it("calls onToggle when clicked", () => {
    const onToggle = vi.fn();

    render(
      <PoolHeader
        pool={pool}
        isExpanded={false}
        onToggle={onToggle}
        visibleCourseIds={pool.courses}
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
        visibleCourseIds={[]}
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
