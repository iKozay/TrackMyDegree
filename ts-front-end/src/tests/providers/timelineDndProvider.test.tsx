/* eslint-disable react-hooks/immutability */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import * as DndKitCore from "@dnd-kit/core";

import TimelineDndProvider from "../../providers/timelineDndProvider";
import { useTimelineDnd } from "../../contexts/timelineDndContext";

// --- Test consumer to read activeCourseId from context ---
const ActiveCourseConsumer: React.FC = () => {
  const { activeCourseId } = useTimelineDnd();
  return <div>Active: {activeCourseId ?? "none"}</div>;
};

// --- Mock @dnd-kit/core with handler store ---
vi.mock("@dnd-kit/core", () => {
  const handlerStore: {
    onDragStart?: (event: any) => void;
    onDragEnd?: (event: any) => void;
  } = {};

  const DndContextMock = ({
    children,
    onDragStart,
    onDragEnd,
  }: {
    children: React.ReactNode;
    onDragStart?: (e: any) => void;
    onDragEnd?: (e: any) => void;
  }) => {
    handlerStore.onDragStart = onDragStart;
    handlerStore.onDragEnd = onDragEnd;
    return <div data-testid="dnd-context">{children}</div>;
  };

  const DragOverlayMock = ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="drag-overlay">{children}</div>
  );

  return {
    DndContext: DndContextMock,
    DragOverlay: DragOverlayMock,
    useSensor: vi.fn(),
    useSensors: vi.fn(() => []),
    PointerSensor: vi.fn(),
    closestCenter: vi.fn(),
    __test: {
      getOnDragStart: () => handlerStore.onDragStart,
      getOnDragEnd: () => handlerStore.onDragEnd,
    },
  };
});

describe("TimelineDndProvider", () => {
  const onMoveFromPoolToSemester = vi.fn();
  const onMoveBetweenSemesters = vi.fn();

  beforeEach(() => {
    onMoveFromPoolToSemester.mockClear();
    onMoveBetweenSemesters.mockClear();
  });

  it("provides context with activeCourseId and shows overlay while dragging", () => {
    const courses = {
      "COMP 248": {
        id: "COMP 248",
        title: "Object-Oriented Programming I",
        description: "Test description",
        credits: 3,
        offeredIN: [],
        prerequisites: [],
        corequisites: [],
        status: { status: "incomplete" as const, semester: null },
      },
    };

    render(
      <TimelineDndProvider
        courses={courses}
        onMoveFromPoolToSemester={onMoveFromPoolToSemester}
        onMoveBetweenSemesters={onMoveBetweenSemesters}>
        <ActiveCourseConsumer />
      </TimelineDndProvider>
    );

    // initially
    expect(screen.getByText("Active: none")).toBeInTheDocument();
    expect(screen.getByTestId("drag-overlay").textContent).toBe("");

    const getOnDragStart = (DndKitCore as any).__test.getOnDragStart as () =>
      | ((e: any) => void)
      | undefined;
    const getOnDragEnd = (DndKitCore as any).__test.getOnDragEnd as () =>
      | ((e: any) => void)
      | undefined;

    const onDragStart = getOnDragStart();
    const onDragEnd = getOnDragEnd();

    expect(onDragStart).toBeDefined();
    expect(onDragEnd).toBeDefined();

    // 🔹 simulate drag start – wrap in act so state updates flush
    act(() => {
      onDragStart!({
        active: {
          data: {
            current: {
              type: "course",
              courseId: "COMP 248",
              source: "pool",
              semesterId: undefined,
            },
          },
        },
      });
    });

    // ✅ Now UI should reflect the active course
    expect(screen.getByText("Active: COMP 248")).toBeInTheDocument();
    expect(screen.getByTestId("drag-overlay").textContent).toContain(
      "COMP 248"
    );

    // 🔹 simulate drag end over a semester
    act(() => {
      onDragEnd!({
        active: {
          data: {
            current: {
              type: "course",
              courseId: "COMP 248",
              source: "pool",
              semesterId: undefined,
            },
          },
        },
        over: {
          data: {
            current: {
              type: "semester",
              semesterId: "FALL 2025",
            },
          },
        },
      });
    });

    // activeCourseId cleared
    expect(screen.getByText("Active: none")).toBeInTheDocument();
    expect(screen.getByTestId("drag-overlay").textContent).not.toContain(
      "COMP 248"
    );

    // handler called
    expect(onMoveFromPoolToSemester).toHaveBeenCalledTimes(1);
    expect(onMoveFromPoolToSemester).toHaveBeenCalledWith(
      "COMP 248",
      "FALL 2025"
    );
  });
});
