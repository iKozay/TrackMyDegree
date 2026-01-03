import { describe, it, expect } from "vitest";
import {
  canDropCourse,
  calculateEarnedCredits,
} from "../../utils/timelineUtils";
import type { Course, CourseMap } from "../../types/timeline.types";

describe("timelineUtils", () => {
  describe("canDropCourse", () => {
    const mockCourse: Course = {
      id: "COMP 248",
      title: "Object-Oriented Programming I",
      credits: 3,
      description: "Introduction to programming",
      offeredIN: ["FALL 2025"],
      prerequisites: [],
      corequisites: [],
      status: {
        status: "incomplete",
        semester: null,
      },
    };

    it("allows dropping course with no current semester", () => {
      const result = canDropCourse(mockCourse, {}, []);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("allows dropping course within the same semester", () => {
      const courseInSemester: Course = {
        ...mockCourse,
        status: {
          status: "planned",
          semester: "FALL 2025",
        },
      };

      const result = canDropCourse(courseInSemester, {}, [], "FALL 2025", "FALL 2025");
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("blocks dropping course to different semester", () => {
      const courseInSemester: Course = {
        ...mockCourse,
        status: {
          status: "planned",
          semester: "FALL 2025",
        },
      };

      const result = canDropCourse(courseInSemester, {}, []);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("Course already in FALL 2025");
    });

    it("blocks dropping course already in a semester when no fromSemester provided", () => {
      const courseInSemester: Course = {
        ...mockCourse,
        status: {
          status: "planned",
          semester: "WINTER 2026",
        },
      };

      const result = canDropCourse(courseInSemester, {}, []);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("Course already in WINTER 2026");
    });
  });

  describe("calculateEarnedCredits", () => {
    it("returns 0 for empty course map", () => {
      const courses: CourseMap = {};
      const result = calculateEarnedCredits(courses);
      expect(result).toBe(0);
    });

    it("calculates total credits for completed courses only", () => {
      const courses: CourseMap = {
        "COMP 248": {
          id: "COMP 248",
          title: "OOP I",
          credits: 3,
          description: "",
          offeredIN: ["FALL 2025"],
          prerequisites: [],
          corequisites: [],
          status: {
            status: "completed",
            semester: "FALL 2025",
          },
        },
        "COMP 249": {
          id: "COMP 249",
          title: "OOP II",
          credits: 3,
          description: "",
          offeredIN: ["WINTER 2026"],
          prerequisites: [],
          corequisites: [],
          status: {
            status: "planned",
            semester: "WINTER 2026",
          },
        },
        "COMP 348": {
          id: "COMP 348",
          title: "Advanced Programming",
          credits: 4,
          description: "",
          offeredIN: ["FALL 2026"],
          prerequisites: [],
          corequisites: [],
          status: {
            status: "incomplete",
            semester: null,
          },
        },
      };

      const result = calculateEarnedCredits(courses);
      expect(result).toBe(3);
    });
  });
});
