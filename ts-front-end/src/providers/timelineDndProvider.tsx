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
import type { DragCourseData,  DndSemesterData, DroppableSemesterSlotData } from "../types/dnd.types";
import { TimelineDndContext } from "../contexts/timelineDndContext";
import { canDropCourse, wouldCreateDuplicateSemesterKey } from "../utils/timelineUtils";
import { toast } from "react-toastify";

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
    const data = event.active.data.current as DragCourseData | DndSemesterData | undefined;
    if (data?.type === "course") {
      setActiveCourseId(data.courseId);
    } else if (data?.type === "semester") {
      setActiveSemesterId(data.semesterId);
    }
  };

  const handleSemesterReorder = (activeData: DndSemesterData, overData: DroppableSemesterSlotData) => {
    const fromIndex = semesters.findIndex((s) => s.term === activeData.semesterId);
    if (fromIndex === -1) return;
    const rawToIndex = overData.targetIndex;
    // Adjust target index: dropping after removal shifts indices
    const toIndex = rawToIndex > fromIndex ? rawToIndex - 1 : rawToIndex;
    if (wouldCreateDuplicateSemesterKey(semesters, fromIndex, toIndex)) {
      toast.warning("Only one Fall/Winter semester is allowed per academic year");
      return;
    }
    onMoveSemester(fromIndex, toIndex);
  };

  const handleCourseDrop = (activeData: DragCourseData, overData: DndSemesterData) => {
    const { courseId, source: fromSource, semesterId: fromSemesterId } = activeData;
    const toSemesterId = overData.semesterId;
    if (!toSemesterId) return;
    const validation = canDropCourse(courses[courseId], courses, semesters, fromSemesterId, toSemesterId);
    if (!validation.allowed) {
      alert(validation.reason);
      return;
    }
    if (fromSource === "pool") {
      onMoveFromPoolToSemester(courseId, toSemesterId);
    } else if (fromSource === "planner" && fromSemesterId && fromSemesterId !== toSemesterId) {
      onMoveBetweenSemesters(courseId, fromSemesterId, toSemesterId);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveCourseId(null);
    setActiveSemesterId(null);

    if (!over) return;

    const activeData = active.data.current as DragCourseData | DndSemesterData | undefined;
    const overData = over.data.current as DndSemesterData | DroppableSemesterSlotData | undefined;

    if (activeData?.type === "semester" && overData?.type === "semester-slot") {
      handleSemesterReorder(activeData, overData);
    } else if (activeData?.type === "course" && overData?.type === "semester") {
      handleCourseDrop(activeData, overData);
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
