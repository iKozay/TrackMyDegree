import React, { useState, useRef, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import { DroppableSemester } from "./DroppableSemester";
import { useTimelineDnd } from "../contexts/timelineDndContext";

import type {
  CourseMap,
  CourseCode,
  SemesterList,
  SemesterId,
} from "../types/timeline.types";
import type { DroppableSemesterSlotData } from "../types/dnd.types";
import { Plus, CalendarDays } from "lucide-react";
import { toast } from "react-toastify";
import { getMissingSemesterBetween, wouldCreateDuplicateFallWinter } from "../utils/timelineUtils";

interface SemesterPlannerProps {
  semesters: SemesterList;
  courses: CourseMap;
  onCourseSelect: (courseId: CourseCode) => void;
  selectedCourse?: CourseCode | null;
  onAddSemester: () => void;
  onAddFallWinterSemester: () => void;
  onRemoveSemester?: (semesterId: SemesterId) => void;
  onInsertSemesterAt?: (semesterId: SemesterId, atIndex: number) => void;
  timelineName?: string;
}

/** Droppable gap between semester cards */
const SemesterSlot: React.FC<{ index: number; isActive: boolean }> = ({ index, isActive }) => {
  const data: DroppableSemesterSlotData = { type: "semester-slot", targetIndex: index };
  const { isOver, setNodeRef } = useDroppable({
    id: `semester-slot-${index}`,
    data,
  });

  if (!isActive) return null;

  return (
    <div
      ref={setNodeRef}
      className={`semester-drop-slot ${isOver ? "semester-drop-slot--over" : ""}`}
    />
  );
};

/** Hoverable gap between two adjacent semester cards that shows a + button when
 *  exactly one semester is missing in the sequence. */
const SemesterGap: React.FC<{
  leftTerm: SemesterId;
  rightTerm: SemesterId;
  semesters: SemesterList;
  insertIndex: number;
  onInsert?: (semesterId: SemesterId, atIndex: number) => void;
}> = ({ leftTerm, rightTerm, semesters, insertIndex, onInsert }) => {
  const missing = getMissingSemesterBetween(leftTerm, rightTerm, semesters);
  if (!missing) return null;

  return (
    <div className="semester-gap" title={`Insert ${missing}`}>
      <button
        className="semester-gap-btn"
        aria-label={`Insert missing semester ${missing}`}
        onClick={() => onInsert?.(missing, insertIndex)}
      >
        <Plus size={14} />
      </button>
      <span className="semester-gap-label">{missing}</span>
    </div>
  );
};

const getDisplayName = (timelineName: string | undefined): string => {
    if (!timelineName) {
        return "Academic Plan";
    }
    return timelineName;
};

const SemesterPlanner: React.FC<SemesterPlannerProps> = ({
  semesters,
  courses,
  onCourseSelect,
  selectedCourse,
  onAddSemester,
  onAddFallWinterSemester,
  onRemoveSemester,
  onInsertSemesterAt,
  timelineName
}) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { activeSemesterId } = useTimelineDnd();
  const isSemesterDragging = activeSemesterId !== null;

  // Close popover on outside click
  useEffect(() => {
    if (!popoverOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [popoverOpen]);

  const handleAddSemester = () => {
    onAddSemester();
    setPopoverOpen(false);
  };

  const handleAddFallWinter = () => {
    if (wouldCreateDuplicateFallWinter(semesters)) {
      toast.warning("Only one Fall/Winter semester is allowed per academic year");
      setPopoverOpen(false);
      return;
    }
    onAddFallWinterSemester();
    setPopoverOpen(false);
  };

  return (
    <div className="timeline">
      <div className="planner-header">
        <h2>{getDisplayName(timelineName)}</h2>

        <div className="add-semester-wrapper" ref={popoverRef}>
          <button
            className="btn btn-tertiary"
            onClick={() => setPopoverOpen((o) => !o)}
            aria-haspopup="true"
            aria-expanded={popoverOpen}>
            <Plus size={16} />
            Add Semester
          </button>

          {popoverOpen && (
            <div className="add-semester-popover" role="menu">
              <button
                className="add-semester-popover-item"
                role="menuitem"
                onClick={handleAddSemester}>
                <Plus size={15} />
                <span>
                  <strong>Add Semester</strong>
                  <small>Adds the next semester in sequence</small>
                </span>
              </button>
              <div className="add-semester-popover-divider" />
              <button
                className="add-semester-popover-item"
                role="menuitem"
                onClick={handleAddFallWinter}>
                <CalendarDays size={15} />
                <span>
                  <strong>Add Fall/Winter Semester</strong>
                  <small>Adds a Fall/Winter term in sequence</small>
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="semesters-grid">
        {semesters.map(({ term, courses: semesterCourses }, idx) => (
          <React.Fragment key={term}>
            <SemesterSlot index={idx} isActive={isSemesterDragging} />
            <DroppableSemester
              semesterId={term}
              courses={courses}
              semesterCourses={semesterCourses}
              onCourseSelect={onCourseSelect}
              selectedCourse={selectedCourse}
              onRemoveSemester={onRemoveSemester}
            />
            {/* Show a gap insert button between this card and the next when not dragging */}
            {!isSemesterDragging && idx < semesters.length - 1 && (
              <SemesterGap
                leftTerm={term}
                rightTerm={semesters[idx + 1].term}
                semesters={semesters}
                insertIndex={idx + 1}
                onInsert={onInsertSemesterAt}
              />
            )}
          </React.Fragment>
        ))}
        {/* trailing slot — allows dropping after the last card */}
        <SemesterSlot index={semesters.length} isActive={isSemesterDragging} />
      </div>
    </div>
  );
};

export default SemesterPlanner;
