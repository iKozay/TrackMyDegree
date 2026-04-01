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
import type { DragCourseData, DroppableSemesterData } from "../types/dnd.types";
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
}

const TimelineDndProvider: React.FC<TimelineDndProviderProps> = ({
  children,
  courses,
  semesters,
  onMoveFromPoolToSemester,
  onMoveBetweenSemesters,
}) => {
  const [activeCourseId, setActiveCourseId] = useState<CourseCode | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as DragCourseData | undefined;
    if (data?.type !== "course") return;
    setActiveCourseId(data.courseId);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveCourseId(null);

    if (!over) return;

    const activeData = active.data.current as DragCourseData | undefined;
    const overData = over.data.current as DroppableSemesterData | undefined;

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

  const contextValue = useMemo(() => ({ activeCourseId }), [activeCourseId]);

  return (
    <TimelineDndContext.Provider value={contextValue}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}>
        {children}

        <DragOverlay>
          {activeCourseId ? (
            <div className="course-card dragging">{activeCourseId}</div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </TimelineDndContext.Provider>
  );
};

export default TimelineDndProvider;
