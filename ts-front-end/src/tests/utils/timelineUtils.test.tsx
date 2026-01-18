import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  canDropCourse,
  calculateEarnedCredits,
  computeTimelinePartialUpdate,
  downloadTimelinePdf,
  getCourseValidationMessage,
  saveTimeline,
} from "../../utils/timelineUtils";
import type {
  Course,
  Pool,
  CourseMap,
  Semester,
  SemesterId,
  TimelineState,
} from "../../types/timeline.types";

vi.mock("../../api/http-api-client", () => ({
  api: {
    post: vi.fn(),
  },
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    promise: vi.fn((promise) => promise),
  },
}));

vi.mock("html2canvas", () => ({
  default: vi.fn(),
}));

vi.mock("jspdf", () => ({
  jsPDF: vi.fn(() => ({
    addImage: vi.fn(),
    save: vi.fn(),
  })),
}));

import { api } from "../../api/http-api-client";
import { toast } from "react-toastify";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

describe("timelineUtils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  describe("canDropCourse", () => {
    const mockCourse: Course = {
      id: "COMP 248",
      title: "Object-Oriented Programming I",
      credits: 3,
      description: "Introduction to programming",
      offeredIN: ["FALL 2025" as SemesterId],
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
          semester: "FALL 2025" as SemesterId,
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
          semester: "FALL 2025" as SemesterId,
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
          semester: "WINTER 2026" as SemesterId,
        },
      };

      const result = canDropCourse(courseInSemester, {}, []);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("Course already in WINTER 2026");
    });

    it("blocks drop when semester credit limit would be exceeded", () => {
      const heavySemester: Semester = {
        term: "FALL 2025" as SemesterId,
        courses: [
          { code: "COMP 248", message: "" },
          { code: "COMP 249", message: "" },
          { code: "COMP 346", message: "" },
          { code: "COMP 348", message: "" },
          { code: "COMP 352", message: "" },
          { code: "COMP 445", message: "" },
          { code: "COMP 472", message: "" },
        ],
      };
      const courses: CourseMap = {
        "COMP 248": { ...mockCourse, credits: 3 },
        "COMP 249": { ...mockCourse, credits: 3 },
        "COMP 346": { ...mockCourse, credits: 3 },
        "COMP 348": { ...mockCourse, credits: 3 },
        "COMP 352": { ...mockCourse, credits: 3 },
        "COMP 445": { ...mockCourse, credits: 3 },
        "COMP 472": { ...mockCourse, credits: 3 },
      };

      const result = canDropCourse(
        { ...mockCourse, credits: 4 },
        courses,
        [heavySemester],
        undefined,
        "FALL 2025" as SemesterId
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/credit limit/i);
    });
  });

  describe("calculateEarnedCredits", () => {
    it("returns 0 for empty course map", () => {
      const courses: CourseMap = {};
      const exemptionPool: Pool = {
        _id: "exemptions",
        name: "exemptions",
        creditsRequired: 0,
        courses: [],
      };
      const result = calculateEarnedCredits(courses, exemptionPool);
      expect(result).toBe(0);
    });

    it("calculates total credits for completed courses only", () => {
      const courses: CourseMap = {
        "COMP 248": {
          id: "COMP 248",
          title: "OOP I",
          credits: 3,
          description: "",
          offeredIN: ["FALL 2025" as SemesterId],
          prerequisites: [],
          corequisites: [],
          status: {
            status: "completed",
            semester: "FALL 2025" as SemesterId,
          },
        },
        "COMP 249": {
          id: "COMP 249",
          title: "OOP II",
          credits: 3,
          description: "",
          offeredIN: ["WINTER 2026" as SemesterId],
          prerequisites: [],
          corequisites: [],
          status: {
            status: "planned",
            semester: "WINTER 2026" as SemesterId,
          },
        },
        "COMP 348": {
          id: "COMP 348",
          title: "Advanced Programming",
          credits: 4,
          description: "",
          offeredIN: ["FALL 2026" as SemesterId],
          prerequisites: [],
          corequisites: [],
          status: {
            status: "incomplete",
            semester: null,
          },
        },
      };

      const exemptionPool: Pool = {
        _id: "exemptions",
        name: "exemptions",
        creditsRequired: 0,
        courses: [],
      };
      const result = calculateEarnedCredits(courses, exemptionPool);
      expect(result).toBe(3);
    });
  });

  describe("saveTimeline", () => {
    it("posts timeline payload and shows success toast via promise", async () => {
      vi.mocked(api.post).mockResolvedValueOnce({} as any);

      await saveTimeline("user-1", "My Timeline", "job-1");

      expect(api.post).toHaveBeenCalledWith("/timeline", {
        userId: "user-1",
        timelineName: "My Timeline",
        jobId: "job-1",
      });
      expect(toast.promise).toHaveBeenCalledWith(
        expect.any(Promise),
        expect.objectContaining({
          pending: expect.any(String),
          success: expect.any(String),
          error: expect.any(String),
        })
      );
    });

    it("handles API errors via toast promise", async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error("boom"));

      await saveTimeline("user-2", "Other Timeline");

      expect(api.post).toHaveBeenCalledWith("/timeline", {
        userId: "user-2",
        timelineName: "Other Timeline",
      });
      expect(toast.promise).toHaveBeenCalled();
    });
  });

  describe("getCourseValidationMessage", () => {
    const baseCourse: Course = {
      id: "COMP 248",
      title: "OOP I",
      credits: 3,
      description: "",
      offeredIN: ["FALL 2025" as SemesterId],
      prerequisites: [],
      corequisites: [],
      status: { status: "planned", semester: "FALL 2025" as SemesterId },
    };

    const baseState: TimelineState = {
      timelineName: "Test",
      degree: { name: "CS", totalCredits: 90, coursePools: [] },
      pools: [],
      selectedCourse: null,
      history: [],
      future: [],
      modal: { open: false, type: "" },
      semesters: [
        {
          term: "FALL 2025" as SemesterId,
          courses: [{ code: "COMP 248", message: "" }],
        },
        { term: "WINTER 2026" as SemesterId, courses: [] },
      ],
      courses: {
        "COMP 248": baseCourse,
        "COMP 249": {
          ...baseCourse,
          id: "COMP 249",
          status: { status: "planned", semester: "WINTER 2026" as SemesterId },
        },
      },
    };

    it("returns empty message when course has no semester", () => {
      const result = getCourseValidationMessage(
        { ...baseCourse, status: { status: "planned", semester: null } },
        baseState
      );
      expect(result).toBe("");
    });

    it("returns empty message when semester is not found", () => {
      const result = getCourseValidationMessage(
        {
          ...baseCourse,
          status: { status: "planned", semester: "SUMMER 2030" as SemesterId },
        },
        baseState
      );
      expect(result).toBe("");
    });

    it("flags unmet prerequisites", () => {
      const course = {
        ...baseCourse,
        prerequisites: [{ anyOf: ["COMP 249"] }],
      };

      const result = getCourseValidationMessage(course, baseState);
      expect(result).toContain("Prerequisite");
    });

    it("flags unmet corequisites", () => {
      const course = {
        ...baseCourse,
        corequisites: [{ anyOf: ["COMP 249"] }],
      };

      const result = getCourseValidationMessage(course, baseState);
      expect(result).toContain("Corequisite");
    });

    it("returns empty message when requisites are satisfied", () => {
      const state: TimelineState = {
        ...baseState,
        courses: {
          ...baseState.courses,
          "COMP 249": {
            ...baseState.courses["COMP 249"],
            status: { status: "completed", semester: "FALL 2025" as SemesterId },
          },
        },
      };

      const course = {
        ...baseCourse,
        prerequisites: [{ anyOf: ["COMP 249"] }],
      };

      expect(getCourseValidationMessage(course, state)).toBe("");
    });

    it("ignores non-object requisite groups", () => {
      const course = {
        ...baseCourse,
        prerequisites: "COMP 249",
        corequisites: "COMP 249",
      };
      expect(getCourseValidationMessage(course, baseState)).toBe("");
    });
  });

  describe("computeTimelinePartialUpdate", () => {
    const baseState: TimelineState = {
      timelineName: "Test",
      degree: { name: "CS", totalCredits: 90, coursePools: [] },
      pools: [
        { _id: "exemptions", name: "exemptions", creditsRequired: 0, courses: [] },
        { _id: "deficiencies", name: "deficiencies", creditsRequired: 0, courses: [] },
      ],
      courses: {
        "COMP 248": {
          id: "COMP 248",
          title: "OOP",
          credits: 3,
          description: "",
          offeredIN: [] as SemesterId[],
          prerequisites: [],
          corequisites: [],
          status: { status: "completed", semester: "FALL 2025" as SemesterId },
        },
      },
      semesters: [
        {
          term: "FALL 2025" as SemesterId,
          courses: [{ code: "COMP 248", message: "" }],
        },
      ],
      selectedCourse: null,
      history: [],
      future: [],
      modal: { open: false, type: "" },
    };

    it("returns null when no changes detected", () => {
      expect(computeTimelinePartialUpdate(baseState, baseState)).toBeNull();
    });

    it("detects changes in pools and courses", () => {
      const updated: TimelineState = {
        ...baseState,
        pools: [
          { ...baseState.pools[0], courses: ["COMP 248"] },
          baseState.pools[1],
        ],
        courses: {
          ...baseState.courses,
          "COMP 248": {
            ...baseState.courses["COMP 248"],
            status: { status: "planned", semester: "WINTER 2026" as SemesterId },
          },
        },
      };

      const update = computeTimelinePartialUpdate(baseState, updated);

      expect(update?.exemptions).toEqual(["COMP 248"]);
      expect(update?.courses).toBeDefined();
    });

    it("detects semester list changes", () => {
      const updated: TimelineState = {
        ...baseState,
        semesters: [
          ...baseState.semesters,
          { term: "WINTER 2026" as SemesterId, courses: [] },
        ],
      };
      const update = computeTimelinePartialUpdate(baseState, updated);
      expect(update?.semesters).toHaveLength(2);
    });
  });

  describe("downloadTimelinePdf", () => {
    it("logs an error if semesters grid is missing", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
      await downloadTimelinePdf();
      expect(errorSpy).toHaveBeenCalledWith("Semesters grid not found");
    });

    it("renders and saves a PDF when grid exists", async () => {
      const grid = document.createElement("div");
      grid.className = "semesters-grid";
      grid.style.width = "100px";
      grid.style.height = "100px";
      document.body.appendChild(grid);

      const toDataURL = vi.fn(() => "data:image/png;base64,abc");
      const canvas = {
        width: 200,
        height: 100,
        toDataURL,
      };

      vi.mocked(html2canvas as any).mockResolvedValueOnce(canvas);

      const addImage = vi.fn();
      const save = vi.fn();
      const MockJsPDF = vi.mocked(jsPDF);
      MockJsPDF.mockImplementation(function (this: any) {
        this.addImage = addImage;
        this.save = save;
        return this;
      } as any);

      await downloadTimelinePdf();

      expect(addImage).toHaveBeenCalled();
      expect(save).toHaveBeenCalledWith("timeline.pdf");
    });
  });
});
