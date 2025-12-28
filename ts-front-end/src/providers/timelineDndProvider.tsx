import React, { useState, type ReactNode } from "react";
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
import type { CourseCode, SemesterId } from "../types/timeline.types";
import type { DragCourseData, DroppableSemesterData } from "../types/dnd.types";
import { TimelineDndContext } from "../contexts/timelineDndContext";
import type { CourseMap } from "../types/timeline.types";
import { canDropCourse } from "../utils/timelineUtils";

interface TimelineDndProviderProps {
  children: ReactNode;
  courses: CourseMap;
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
    if (!data || data.type !== "course") return;
    setActiveCourseId(data.courseId);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveCourseId(null);

    if (!over) return;

    const activeData = active.data.current as DragCourseData | undefined;
    const overData = over.data.current as DroppableSemesterData | undefined;

    if (!activeData || activeData.type !== "course") return;
    if (!overData || overData.type !== "semester") return;

    const courseId = activeData.courseId;
    const fromSource = activeData.source;
    const fromSemesterId = activeData.semesterId;
    const toSemesterId = overData.semesterId;

    if (!toSemesterId) return;

    const validation = canDropCourse(courses[courseId], fromSemesterId);

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

  return (
    <TimelineDndContext.Provider value={{ activeCourseId }}>
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
