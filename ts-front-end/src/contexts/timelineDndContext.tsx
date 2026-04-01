import { createContext, useContext } from "react";
import type { CourseCode, SemesterId } from "../types/timeline.types";

export interface TimelineDndContextValue {
  activeCourseId: CourseCode | null;
  activeSemesterId: SemesterId | null;
}

export const TimelineDndContext = createContext<
  TimelineDndContextValue | undefined
>(undefined);

export const useTimelineDnd = (): TimelineDndContextValue => {
  const ctx = useContext(TimelineDndContext);
  if (!ctx) {
    throw new Error("useTimelineDnd must be used within TimelineDndProvider");
  }
  return ctx;
};
