import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  canDropCourse,
  calculateEarnedCredits,
  computeTimelinePartialUpdate,
  downloadTimelinePdf,
  getCourseValidationMessage,
  saveTimeline,
  canAddCourse,
} from "../../utils/timelineUtils";
import { RuleType, type CoursePoolData, type Rule } from "@trackmydegree/shared";
import type {
  Course,
  CourseMap,
  Semester,
  SemesterId,
  TimelineState,
  RequisiteGroup,
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
      offeredIn: ["FALL 2025" as SemesterId],
      rules: [],
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

      const result = canDropCourse(
        courseInSemester,
        {},
        [],
        "FALL 2025",
        "FALL 2025",
      );
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
        "FALL 2025" as SemesterId,
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/credit limit/i);
    });
  });

  describe("calculateEarnedCredits", () => {
    it("returns 0 for empty course map", () => {
      const courses: CourseMap = {};
      const exemptionPool: CoursePoolData = {
        _id: "exemptions",
        name: "exemptions",
        creditsRequired: 0,
        courses: [],
        rules: [],
      };
      const result = calculateEarnedCredits(courses, exemptionPool);
      expect(result).toBe(0);
    });

    it("calculates total credits for completed and planned courses", () => {
      const courses: CourseMap = {
        "COMP 248": {
          id: "COMP 248",
          title: "OOP I",
          credits: 3,
          description: "",
          offeredIn: ["FALL 2025" as SemesterId],
          rules: [],
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
          offeredIn: ["WINTER 2026" as SemesterId],
          rules: [],
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
          offeredIn: ["FALL 2026" as SemesterId],
          rules: [],
          status: {
            status: "incomplete",
            semester: null,
          },
        },
      };

      const exemptionPool: CoursePoolData = {
        _id: "exemptions",
        name: "exemptions",
        creditsRequired: 0,
        courses: [],
        rules: [],
      };
      const result = calculateEarnedCredits(courses, exemptionPool);
      expect(result).toBe(6);
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
        }),
      );
    });

    it("handles API errors via toast promise", async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error("boom"));

      try {
        await saveTimeline("user-2", "Other Timeline");
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        // toast.promise might rethrow depending on implementation,
        // but here we just want to ensure it was called
      }

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
      offeredIn: ["FALL 2025" as SemesterId],
      rules: [],
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
          status: { status: "incomplete", semester: null },
        },
      },
    };

    it("returns empty message when course has no semester", () => {
      const result = getCourseValidationMessage(
        { ...baseCourse, status: { status: "planned", semester: null } },
        baseState,
      );
      expect(result).toBe("");
    });

    it("returns empty message when semester is not found", () => {
      const result = getCourseValidationMessage(
        {
          ...baseCourse,
          status: { status: "planned", semester: "SUMMER 2030" as SemesterId },
        },
        baseState,
      );
      expect(result).toBe("");
    });

    it("flags unmet prerequisites", () => {
      const course = {
        ...baseCourse,
        rules: [{
          type: "prerequisite",
          level: "warning",
          message: "At least 1 of the following courses must be completed previously: COMP 249.",
          params: {
            courseList: ["COMP 249"],
            minCourses: 1
          }
        }],
      };

      const result = getCourseValidationMessage(course, baseState);
      expect(result).toContain("At least 1 of the following courses must be completed previously: COMP 249.");
    });

    it("flags unmet corequisites", () => {
      const course = {
        ...baseCourse,
        rules: [{
          type: "corequisite",
          level: "warning",
          message: "At least 1 of the following courses must be completed previously or taken concurrently: COMP 249.",
          params: {
            courseList: ["COMP 249"],
            minCourses: 1
          }
        }],
      };

      const result = getCourseValidationMessage(course, baseState);
      expect(result).toContain("At least 1 of the following courses must be completed previously or taken concurrently: COMP 249.");
    });

    it("returns empty message when requisites are satisfied", () => {
      const state: TimelineState = {
        ...baseState,
        courses: {
          ...baseState.courses,
          "COMP 249": {
            ...baseState.courses["COMP 249"],
            status: {
              status: "completed",
              semester: "FALL 2025" as SemesterId,
            },
          },
        },
      };

      const course = {
        ...baseCourse,
        rules: [{
          type: "prerequisite",
          level: "warning",
          message: "At least 1 of the following courses must be completed previously: COMP 249.",
          params: {
            courseList: ["COMP 249"],
            minCourses: 1
          }
        }],
      };

      expect(getCourseValidationMessage(course, state)).toBe("");
    });

    it("ignores courses with empty rules array", () => {
      const course = {
        ...baseCourse,
        rules: [],
      };
      expect(getCourseValidationMessage(course, baseState)).toBe("");
    });

    it("flags min credits from set when credits are below minimum", () => {
      const course: Course = {
        ...baseCourse,
        id: "COMP 352",
        rules: [
          {
            type: RuleType.MinCreditsFromSet,
            level: "warning",
            message: "Need at least 6 credits from COMP 248/COMP 249.",
            params: { courseList: ["COMP 352", "COMP 248", "COMP 249"], minCredits: 6 },
          } as Rule,
        ],
      };

      const state: TimelineState = {
        ...baseState,
        courses: {
          ...baseState.courses,
          "COMP 352": {
            ...baseCourse,
            id: "COMP 352",
            status: { status: "planned", semester: "FALL 2025" as SemesterId },
          },
          "COMP 248": {
            ...baseState.courses["COMP 248"],
            status: { status: "completed", semester: "FALL 2025" as SemesterId },
          },
          "COMP 249": {
            ...baseState.courses["COMP 249"],
            status: { status: "incomplete", semester: null },
          },
        },
      };

      expect(getCourseValidationMessage(course, state)).toContain("Need at least 6 credits from COMP 248/COMP 249.");
    });

    it("flags max credits from set when credits exceed maximum", () => {
      const course: Course = {
        ...baseCourse,
        id: "COMP 352",
        rules: [
          {
            type: RuleType.MaxCreditsFromSet,
            level: "warning",
            message: "No more than 3 credits allowed from COMP 248/COMP 249.",
            params: { courseList: ["COMP 352", "COMP 248", "COMP 249"], maxCredits: 3 },
          } as Rule,
        ],
      };

      const state: TimelineState = {
        ...baseState,
        courses: {
          ...baseState.courses,
          "COMP 352": {
            ...baseCourse,
            id: "COMP 352",
            status: { status: "planned", semester: "FALL 2025" as SemesterId },
          },
          "COMP 248": {
            ...baseState.courses["COMP 248"],
            status: { status: "completed", semester: "FALL 2025" as SemesterId },
          },
          "COMP 249": {
            ...baseState.courses["COMP 249"],
            status: { status: "completed", semester: "FALL 2025" as SemesterId },
          },
        },
      };

      expect(getCourseValidationMessage(course, state)).toContain("No more than 3 credits allowed from COMP 248/COMP 249.");
    });

    it("flags min courses from set when course count is below minimum", () => {
      const course: Course = {
        ...baseCourse,
        id: "COMP 352",
        rules: [
          {
            type: RuleType.MinCoursesFromSet,
            level: "warning",
            message: "Need at least 3 courses from COMP 248/COMP 249.",
            params: { courseList: ["COMP 352", "COMP 248", "COMP 249"], minCourses: 3 },
          } as Rule,
        ],
      };

      const state: TimelineState = {
        ...baseState,
        courses: {
          ...baseState.courses,
          "COMP 352": {
            ...baseCourse,
            id: "COMP 352",
            status: { status: "planned", semester: "FALL 2025" as SemesterId },
          },
          "COMP 248": {
            ...baseState.courses["COMP 248"],
            status: { status: "completed", semester: "FALL 2025" as SemesterId },
          },
          "COMP 249": {
            ...baseState.courses["COMP 249"],
            status: { status: "incomplete", semester: null },
          },
        },
      };

      expect(getCourseValidationMessage(course, state)).toContain("Need at least 3 courses from COMP 248/COMP 249.");
    });

    it("flags max courses from set when course count exceeds maximum", () => {
      const course: Course = {
        ...baseCourse,
        id: "COMP 352",
        rules: [
          {
            type: RuleType.MaxCoursesFromSet,
            level: "warning",
            message: "No more than 1 course allowed from COMP 248/COMP 249.",
            params: { courseList: ["COMP 352", "COMP 248", "COMP 249"], maxCourses: 1 },
          } as Rule,
        ],
      };

      const state: TimelineState = {
        ...baseState,
        courses: {
          ...baseState.courses,
          "COMP 352": {
            ...baseCourse,
            id: "COMP 352",
            status: { status: "planned", semester: "FALL 2025" as SemesterId },
          },
          "COMP 248": {
            ...baseState.courses["COMP 248"],
            status: { status: "completed", semester: "FALL 2025" as SemesterId },
          },
          "COMP 249": {
            ...baseState.courses["COMP 249"],
            status: { status: "planned", semester: "WINTER 2026" as SemesterId },
          },
        },
      };

      expect(getCourseValidationMessage(course, state)).toContain("No more than 1 course allowed from COMP 248/COMP 249.");
    });

    it("skips set-based rules when target course is not in courseList", () => {
      const course: Course = {
        ...baseCourse,
        id: "COMP 352",
        rules: [
          {
            type: RuleType.MinCoursesFromSet,
            level: "warning",
            message: "This should be skipped.",
            params: { courseList: ["COMP 248", "COMP 249"], minCourses: 2 },
          } as Rule,
        ],
      };

      expect(getCourseValidationMessage(course, baseState)).toBe("");
    });
  });

  describe("computeTimelinePartialUpdate", () => {
    const baseState: TimelineState = {
      timelineName: "Test",
      degree: { name: "CS", totalCredits: 90, coursePools: [] },
      pools: [
        { _id: "exemptions", name: "exemptions", creditsRequired: 0, courses: [], rules: [] },
        { _id: "deficiencies", name: "deficiencies", creditsRequired: 0, courses: [], rules: [] },
      ],
      courses: {
        "COMP 248": {
          id: "COMP 248",
          title: "OOP",
          credits: 3,
          description: "",
          offeredIn: [] as SemesterId[],
          rules: [],
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
            status: {
              status: "planned",
              semester: "WINTER 2026" as SemesterId,
            },
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
    it("detects timeline name changes", () => {
      const updated: TimelineState = {
        ...baseState,
        timelineName: "Updated Timeline Name",
      };

      const update = computeTimelinePartialUpdate(baseState, updated);

      expect(update?.timelineName).toBe("Updated Timeline Name");
    });
  });

  describe("downloadTimelinePdf", () => {
    it("logs an error if semesters grid is missing", async () => {
      const errorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
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
  describe("canAddCourse", () => {
    let courses: CourseMap;
    let pools: Pool[];

    beforeEach(() => {
      courses = {
        "COMP 248": {
          id: "COMP 248",
          title: "Object-Oriented Programming I",
          credits: 3,
          description: "Intro to programming",
          offeredIN: ["FALL 2025" as SemesterId],
          prerequisites: [] as RequisiteGroup[],
          corequisites: [] as RequisiteGroup[],
          status: { status: "incomplete", semester: null },
        },
        "COMP 249": {
          id: "COMP 249",
          title: "Object-Oriented Programming II",
          credits: 3,
          description: "Advanced programming",
          offeredIN: ["WINTER 2026"],
          prerequisites: [] as RequisiteGroup[],
          corequisites: [] as RequisiteGroup[],
          status: { status: "incomplete", semester: null },
        },
      };

      pools = [
        {
          _id: "pool1",
          name: "exemptions",
          courses: ["COMP 248"], // course already in this pool
          creditsRequired: 3,
        },
        {
          _id: "pool2",
          name: "deficiencies",
          courses: [], // can be empty
          creditsRequired: 3,
        },
      ];
    });

    it("returns 'invalid_type' for unknown type", () => {
      const result = canAddCourse("COMP 248", "unknown", courses, pools);
      expect(result).toBe("invalid_type");
    });

    it("returns 'course_not_found' if course does not exist", () => {
      const result = canAddCourse("COMP 999", "exemption", courses, pools);
      expect(result).toBe("course_not_found");
    });

    it("returns 'already_exists' if course already exists in pool", () => {
      const result = canAddCourse("COMP 248", "exemption", courses, pools);
      expect(result).toBe("already_exists");
    });

    it("returns 'ok' if course can be added to pool", () => {
      const result = canAddCourse("COMP 249", "deficiency", courses, pools);
      expect(result).toBe("ok");
    });

    it("returns 'invalid_type' if pool is missing", () => {
      const brokenPools: Pool[] = [
        { _id: "pool1", name: "exemptions", courses: [], creditsRequired: 3 },
      ];
      const result = canAddCourse(
        "COMP 249",
        "deficiency",
        courses,
        brokenPools,
      );
      expect(result).toBe("invalid_type");
    });
  });
});
