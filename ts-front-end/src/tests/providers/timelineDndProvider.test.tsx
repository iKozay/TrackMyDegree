import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import * as DndKitCore from "@dnd-kit/core";

import TimelineDndProvider from "../../providers/timelineDndProvider";
import { useTimelineDnd } from "../../contexts/timelineDndContext";
import type { SemesterId } from "../../types/timeline.types";

// --- Test consumer to read activeCourseId and activeSemesterId from context ---
const ActiveConsumer: React.FC = () => {
  const { activeCourseId, activeSemesterId } = useTimelineDnd();
  return (
    <div>
      <div>Active course: {activeCourseId ?? "none"}</div>
      <div>Active semester: {activeSemesterId ?? "none"}</div>
    </div>
  );
};

// Keep the old name for backward compat with existing test
const ActiveCourseConsumer = ActiveConsumer;

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
    React.useEffect(() => {
      handlerStore.onDragStart = onDragStart;
      handlerStore.onDragEnd = onDragEnd;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onDragStart, onDragEnd]);
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
  const onMoveSemester = vi.fn();

  beforeEach(() => {
    onMoveFromPoolToSemester.mockClear();
    onMoveBetweenSemesters.mockClear();
    onMoveSemester.mockClear();
  });

  const defaultCourses = {
    "COMP 248": {
      id: "COMP 248",
      title: "Object-Oriented Programming I",
      description: "Test description",
      credits: 3,
      offeredIn: [],
      prerequisites: [],
      corequisites: [],
      rules: [],
      status: { status: "incomplete" as const, semester: null },
    },
  };

  const defaultSemesters = [
    { term: "FALL 2025" as SemesterId, courses: [] as any[] },
    { term: "FALL/WINTER 2025-26" as SemesterId, courses: [] as any[] },
    { term: "WINTER 2026" as SemesterId, courses: [] as any[] },
  ];

  it("provides context with activeCourseId and shows overlay while dragging", () => {
    render(
      <TimelineDndProvider
        courses={defaultCourses}
        semesters={[]}
        onMoveFromPoolToSemester={onMoveFromPoolToSemester}
        onMoveBetweenSemesters={onMoveBetweenSemesters}
        onMoveSemester={onMoveSemester}>
        <ActiveCourseConsumer />
      </TimelineDndProvider>
    );

    // initially
    expect(screen.getByText("Active course: none")).toBeInTheDocument();
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
    expect(screen.getByText("Active course: COMP 248")).toBeInTheDocument();
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
    expect(screen.getByText("Active course: none")).toBeInTheDocument();
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

  it("sets activeSemesterId and shows semester overlay when dragging a semester card", () => {
    render(
      <TimelineDndProvider
        courses={defaultCourses}
        semesters={defaultSemesters}
        onMoveFromPoolToSemester={onMoveFromPoolToSemester}
        onMoveBetweenSemesters={onMoveBetweenSemesters}
        onMoveSemester={onMoveSemester}>
        <ActiveConsumer />
      </TimelineDndProvider>
    );

    const getOnDragStart = (DndKitCore as any).__test.getOnDragStart as () => ((e: any) => void) | undefined;
    const onDragStart = getOnDragStart();

    act(() => {
      onDragStart!({
        active: {
          data: {
            current: {
              type: "semester",
              semesterId: "FALL/WINTER 2025-26",
            },
          },
        },
      });
    });

    expect(screen.getByText("Active semester: FALL/WINTER 2025-26")).toBeInTheDocument();
    expect(screen.getByTestId("drag-overlay").textContent).toContain("FALL/WINTER 2025-26");
  });

  it("calls onMoveSemester when a semester card is dropped on a semester-slot", () => {
    render(
      <TimelineDndProvider
        courses={defaultCourses}
        semesters={defaultSemesters}
        onMoveFromPoolToSemester={onMoveFromPoolToSemester}
        onMoveBetweenSemesters={onMoveBetweenSemesters}
        onMoveSemester={onMoveSemester}>
        <ActiveConsumer />
      </TimelineDndProvider>
    );

    const getOnDragEnd = (DndKitCore as any).__test.getOnDragEnd as () => ((e: any) => void) | undefined;
    const onDragEnd = getOnDragEnd();

    // "FALL/WINTER 2025-26" is at index 1 in defaultSemesters, dropping to slot 0
    act(() => {
      onDragEnd!({
        active: {
          data: {
            current: {
              type: "semester",
              semesterId: "FALL/WINTER 2025-26",
            },
          },
        },
        over: {
          data: {
            current: {
              type: "semester-slot",
              targetIndex: 0,
            },
          },
        },
      });
    });

    expect(onMoveSemester).toHaveBeenCalledTimes(1);
    // fromIndex=1, rawToIndex=0 → toIndex=0 (rawToIndex <= fromIndex, no adjustment)
    expect(onMoveSemester).toHaveBeenCalledWith(1, 0);
    expect(onMoveFromPoolToSemester).not.toHaveBeenCalled();
  });

  it("clears activeSemesterId after semester drag ends", () => {
    render(
      <TimelineDndProvider
        courses={defaultCourses}
        semesters={defaultSemesters}
        onMoveFromPoolToSemester={onMoveFromPoolToSemester}
        onMoveBetweenSemesters={onMoveBetweenSemesters}
        onMoveSemester={onMoveSemester}>
        <ActiveConsumer />
      </TimelineDndProvider>
    );

    const getOnDragStart = (DndKitCore as any).__test.getOnDragStart as () => ((e: any) => void) | undefined;
    const getOnDragEnd = (DndKitCore as any).__test.getOnDragEnd as () => ((e: any) => void) | undefined;

    act(() => {
      getOnDragStart()!({
        active: { data: { current: { type: "semester", semesterId: "FALL/WINTER 2025-26" } } },
      });
    });

    expect(screen.getByText("Active semester: FALL/WINTER 2025-26")).toBeInTheDocument();

    act(() => {
      getOnDragEnd()!({
        active: { data: { current: { type: "semester", semesterId: "FALL/WINTER 2025-26" } } },
        over: null,
      });
    });

    expect(screen.getByText("Active semester: none")).toBeInTheDocument();
  });

  it("does not call onMoveSemester when semester card dropped with no over target", () => {
    render(
      <TimelineDndProvider
        courses={defaultCourses}
        semesters={defaultSemesters}
        onMoveFromPoolToSemester={onMoveFromPoolToSemester}
        onMoveBetweenSemesters={onMoveBetweenSemesters}
        onMoveSemester={onMoveSemester}>
        <ActiveConsumer />
      </TimelineDndProvider>
    );

    const getOnDragEnd = (DndKitCore as any).__test.getOnDragEnd as () => ((e: any) => void) | undefined;

    act(() => {
      getOnDragEnd()!({
        active: { data: { current: { type: "semester", semesterId: "FALL/WINTER 2025-26" } } },
        over: null,
      });
    });

    expect(onMoveSemester).not.toHaveBeenCalled();
  });
});
