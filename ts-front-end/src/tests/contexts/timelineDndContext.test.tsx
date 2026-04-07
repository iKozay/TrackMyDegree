import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  TimelineDndContext,
  useTimelineDnd,
} from "../../contexts/timelineDndContext"; // ⬅️ adjust path

// Simple test component that uses the hook
const TestComponent: React.FC = () => {
  const { activeCourseId, activeSemesterId } = useTimelineDnd();
  return (
    <div>
      <div>Active course: {activeCourseId ?? "none"}</div>
      <div>Active semester: {activeSemesterId ?? "none"}</div>
    </div>
  );
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
      <TimelineDndContext.Provider
        value={{ activeCourseId: "COMP 248", activeSemesterId: null }}>
        <TestComponent />
      </TimelineDndContext.Provider>
    );

    expect(screen.getByText(/Active course: COMP 248/)).toBeInTheDocument();
    expect(screen.getByText(/Active semester: none/)).toBeInTheDocument();
  });

  it("handles null activeCourseId correctly", () => {
    render(
      <TimelineDndContext.Provider
        value={{ activeCourseId: null, activeSemesterId: null }}>
        <TestComponent />
      </TimelineDndContext.Provider>
    );

    expect(screen.getByText(/Active course: none/)).toBeInTheDocument();
  });

  it("exposes activeSemesterId from context", () => {
    render(
      <TimelineDndContext.Provider
        value={{
          activeCourseId: null,
          activeSemesterId: "FALL/WINTER 2025-26",
        }}>
        <TestComponent />
      </TimelineDndContext.Provider>
    );

    expect(
      screen.getByText(/Active semester: FALL\/WINTER 2025-26/)
    ).toBeInTheDocument();
    expect(screen.getByText(/Active course: none/)).toBeInTheDocument();
  });
});
