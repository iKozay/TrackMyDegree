import { createContext, useContext } from "react";
import type { CourseCode } from "../types/timeline.types";

export interface TimelineDndContextValue {
  activeCourseId: CourseCode | null;
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
