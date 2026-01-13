import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  TimelineDndContext,
  useTimelineDnd,
} from "../../contexts/timelineDndContext"; // ⬅️ adjust path

// Simple test component that uses the hook
const TestComponent: React.FC = () => {
  const { activeCourseId } = useTimelineDnd();
  return <div>Active: {activeCourseId ?? "none"}</div>;
};

describe("useTimelineDnd", () => {
  it("throws if used outside of TimelineDndContext provider", () => {
    // render should throw because hook throws in render
    expect(() => render(<TestComponent />)).toThrow(
      "useTimelineDnd must be used within TimelineDndProvider"
    );
  });

  it("returns context value when used inside provider", () => {
    render(
      <TimelineDndContext.Provider value={{ activeCourseId: "COMP 248" }}>
        <TestComponent />
      </TimelineDndContext.Provider>
    );

    expect(screen.getByText(/Active: COMP 248/)).toBeInTheDocument();
  });

  it("handles null activeCourseId correctly", () => {
    render(
      <TimelineDndContext.Provider value={{ activeCourseId: null }}>
        <TestComponent />
      </TimelineDndContext.Provider>
    );

    expect(screen.getByText(/Active: none/)).toBeInTheDocument();
  });
});
