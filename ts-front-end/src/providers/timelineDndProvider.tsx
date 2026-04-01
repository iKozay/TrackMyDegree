import React, { useState, useMemo, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import type {
  CourseCode,
  SemesterId,
  SemesterList,
  CourseMap,
} from "../types/timeline.types";
import type { DragCourseData, DragSemesterData, DroppableSemesterData, DroppableSemesterSlotData } from "../types/dnd.types";
import { TimelineDndContext } from "../contexts/timelineDndContext";
import { canDropCourse } from "../utils/timelineUtils";

interface TimelineDndProviderProps {
  children: ReactNode;
  courses: CourseMap;
  semesters: SemesterList;
  onMoveFromPoolToSemester: (
    courseId: CourseCode,
    toSemesterId: SemesterId
  ) => void;
  onMoveBetweenSemesters: (
    courseId: CourseCode,
    fromSemesterId: SemesterId,
    toSemesterId: SemesterId
  ) => void;
  onMoveSemester: (fromIndex: number, toIndex: number) => void;
}

const TimelineDndProvider: React.FC<TimelineDndProviderProps> = ({
  children,
  courses,
  semesters,
  onMoveFromPoolToSemester,
  onMoveBetweenSemesters,
  onMoveSemester,
}) => {
  const [activeCourseId, setActiveCourseId] = useState<CourseCode | null>(null);
  const [activeSemesterId, setActiveSemesterId] = useState<SemesterId | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as DragCourseData | DragSemesterData | undefined;
    if (data?.type === "course") {
      setActiveCourseId(data.courseId);
    } else if (data?.type === "semester-card") {
      setActiveSemesterId(data.semesterId);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveCourseId(null);
    setActiveSemesterId(null);

    if (!over) return;

    const activeData = active.data.current as DragCourseData | DragSemesterData | undefined;
    const overData = over.data.current as DroppableSemesterData | DroppableSemesterSlotData | undefined;

    // ---- Semester reordering ----
    if (activeData?.type === "semester-card" && overData?.type === "semester-slot") {
      const fromIndex = semesters.findIndex((s) => s.term === activeData.semesterId);
      const rawToIndex = overData.targetIndex;
      if (fromIndex === -1) return;
      // Adjust target index: dropping after removal shifts indices
      const toIndex = rawToIndex > fromIndex ? rawToIndex - 1 : rawToIndex;
      onMoveSemester(fromIndex, toIndex);
      return;
    }

    if (activeData?.type !== "course") return;
    if (overData?.type !== "semester") return;

    const courseId = activeData.courseId;
    const fromSource = activeData.source;
    const fromSemesterId = activeData.semesterId;
    const toSemesterId = overData.semesterId;

    if (!toSemesterId) return;

    const validation = canDropCourse(
      courses[courseId],
      courses,
      semesters,
      fromSemesterId,
      toSemesterId
    );

    if (!validation.allowed) {
      alert(validation.reason);
      return;
    }

    if (fromSource === "pool") {
      onMoveFromPoolToSemester(courseId, toSemesterId);
      return;
    }

    if (
      fromSource === "planner" &&
      fromSemesterId &&
      fromSemesterId !== toSemesterId
    ) {
      onMoveBetweenSemesters(courseId, fromSemesterId, toSemesterId);
    }
  };

  const contextValue = useMemo(
    () => ({ activeCourseId, activeSemesterId }),
    [activeCourseId, activeSemesterId]
  );

  return (
    <TimelineDndContext.Provider value={contextValue}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}>
        {children}

        <DragOverlay>
          {activeCourseId && (
            <div className="course-card dragging">{activeCourseId}</div>
          )}
          {!activeCourseId && activeSemesterId && (
            <div className="semester semester-drag-overlay">
              <div className="semester-header">
                <span className="semester-title">{activeSemesterId}</span>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </TimelineDndContext.Provider>
  );
};

export default TimelineDndProvider;
