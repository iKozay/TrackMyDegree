import { describe, it, expect } from "vitest";
import {
  optimizePath,
  isOfferedIn,
  arePrereqsSatisfied,
} from "../../utils/graduationOptimizer";
import type {
  TimelineState,
  Course,
  Semester,
  CourseMap,
  Pool,
} from "../../types/timeline.types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildState(overrides: Partial<TimelineState> = {}): TimelineState {
  return {
    timelineName: "Test Plan",
    degree: { name: "BEng", totalCredits: 120, coursePools: [] },
    pools: [],
    courses: {},
    semesters: [{ term: "FALL 2024", courses: [] }],
    selectedCourse: null,
    history: [],
    future: [],
    modal: { open: false, type: "" },
    ...overrides,
  };
}

function makeCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: "TEST 101",
    title: "Test Course",
    credits: 3,
    description: "",
    offeredIN: [],
    prerequisites: [],
    corequisites: [],
    status: { status: "incomplete", semester: null },
    ...overrides,
  };
}

function makePool(overrides: Partial<Pool> = {}): Pool {
  return {
    _id: "pool-core",
    name: "Core",
    creditsRequired: 9,
    courses: [],
    ...overrides,
  };
}

// ─── optimizePath ────────────────────────────────────────────────────────────

describe("optimizePath", () => {
  it("returns unchanged state when there are no incomplete courses", () => {
    const course = makeCourse({
      id: "COMP 101",
      status: { status: "completed", semester: null },
    });
    const pool = makePool({ courses: ["COMP 101"], creditsRequired: 3 });
    const state = buildState({ courses: { "COMP 101": course }, pools: [pool] });

    const result = optimizePath(state);

    expect(result.placedCount).toBe(0);
    expect(result.unplacedCount).toBe(0);
    expect(result.newSemesterCount).toBe(0);
  });

  it("places an incomplete course into a new semester", () => {
    const course = makeCourse({ id: "COMP 101" });
    const pool = makePool({ courses: ["COMP 101"], creditsRequired: 3 });
    const state = buildState({
      courses: { "COMP 101": course },
      pools: [pool],
      semesters: [{ term: "FALL 2024", courses: [] }],
    });

    const result = optimizePath(state);

    expect(result.placedCount).toBe(1);
    expect(result.courses["COMP 101"].status.status).toBe("planned");
  });

  it("respects pool credit cap — stops adding electives once creditsRequired is met", () => {
    // Pool only needs 3 credits but has 3 options of 3 credits each
    const pool = makePool({
      _id: "gen-elec",
      name: "General Electives",
      creditsRequired: 3,
      courses: ["HIST 200", "SOCI 200", "PHIL 200"],
    });
    const courses: CourseMap = {
      "HIST 200": makeCourse({ id: "HIST 200", credits: 3 }),
      "SOCI 200": makeCourse({ id: "SOCI 200", credits: 3 }),
      "PHIL 200": makeCourse({ id: "PHIL 200", credits: 3 }),
    };
    const state = buildState({ pools: [pool], courses });

    const result = optimizePath(state);

    // Only 1 course (3 credits worth) should be placed
    expect(result.placedCount).toBe(1);
  });

  it("fills existing empty semesters before creating new ones", () => {
    const course = makeCourse({ id: "COMP 101" });
    const pool = makePool({ courses: ["COMP 101"], creditsRequired: 3 });
    const state = buildState({
      courses: { "COMP 101": course },
      pools: [pool],
      semesters: [
        { term: "FALL 2024", courses: [{ code: "SOEN 341", message: "" }] },
        { term: "WINTER 2025", courses: [] }, // empty — should be filled first
      ],
    });

    const result = optimizePath(state);

    const winterSem = result.semesters.find((s) => s.term === "WINTER 2025");
    expect(winterSem?.courses.some((c) => c.code === "COMP 101")).toBe(true);
    expect(result.newSemesterCount).toBe(0); // no new semesters needed
  });

  it("handles a timeline with all empty semesters (fresh timeline)", () => {
    const course = makeCourse({ id: "COMP 101" });
    const pool = makePool({ courses: ["COMP 101"], creditsRequired: 3 });
    const state = buildState({
      courses: { "COMP 101": course },
      pools: [pool],
      semesters: [{ term: "FALL 2024", courses: [] }], // empty from the start
    });

    const result = optimizePath(state);

    expect(result.placedCount).toBe(1);
    expect(result.newSemesterCount).toBe(0); // filled the existing empty semester
  });

  it("includes deficiency courses — they are not excluded", () => {
    const course = makeCourse({ id: "MATH 200" });
    const defPool = makePool({
      _id: "deficiencies",
      name: "deficiencies",
      creditsRequired: 3,
      courses: ["MATH 200"],
    });
    const state = buildState({ courses: { "MATH 200": course }, pools: [defPool] });

    const result = optimizePath(state);

    expect(result.placedCount).toBe(1);
  });

  it("excludes exemption pool courses from placement", () => {
    const course = makeCourse({
      id: "COMP 248",
      status: { status: "completed", semester: null },
    });
    const exemptPool = makePool({
      _id: "exemptions",
      name: "exemptions",
      creditsRequired: 3,
      courses: ["COMP 248"],
    });
    const state = buildState({
      courses: { "COMP 248": course },
      pools: [exemptPool],
    });

    const result = optimizePath(state);

    expect(result.placedCount).toBe(0);
  });

  it("does not place a course before its prerequisite", () => {
    const prereq = makeCourse({ id: "COMP 101" });
    const dependent = makeCourse({
      id: "COMP 232",
      prerequisites: [{ anyOf: ["COMP 101"] }],
    });
    const pool = makePool({
      courses: ["COMP 101", "COMP 232"],
      creditsRequired: 6,
    });
    const state = buildState({
      courses: { "COMP 101": prereq, "COMP 232": dependent },
      pools: [pool],
      semesters: [{ term: "FALL 2024", courses: [] }],
    });

    const result = optimizePath(state);

    const semTerms = result.semesters.map((s) => s.term);
    const comp101Sem = result.courses["COMP 101"].status.semester;
    const comp232Sem = result.courses["COMP 232"].status.semester;

    expect(semTerms.indexOf(comp101Sem!)).toBeLessThan(
      semTerms.indexOf(comp232Sem!)
    );
  });

  it("does not exceed 19 credits in a single semester", () => {
    // 7 courses of 3 credits each = 21 credits, should cap at 18 (6 courses)
    const coursesArr = Array.from({ length: 7 }, (_, i) => ({
      id: `COURSE ${i}`,
      course: makeCourse({ id: `COURSE ${i}`, credits: 3 }),
    }));
    const courses: CourseMap = Object.fromEntries(
      coursesArr.map(({ id, course }) => [id, course])
    );
    const pool = makePool({
      courses: coursesArr.map((c) => c.id),
      creditsRequired: 21,
    });
    const state = buildState({
      courses,
      pools: [pool],
      semesters: [{ term: "FALL 2024", courses: [] }],
    });

    const result = optimizePath(state);

    const firstSem = result.semesters[0];
    const totalCredits = firstSem.courses.reduce(
      (sum, sc) => sum + (result.courses[sc.code]?.credits ?? 3),
      0
    );
    expect(totalCredits).toBeLessThanOrEqual(19);
  });
});

// ─── isOfferedIn ─────────────────────────────────────────────────────────────

describe("isOfferedIn", () => {
  it("returns true when offeredIN is empty (assume offered any time)", () => {
    const course = makeCourse({ offeredIN: [] });
    expect(isOfferedIn(course, "FALL 2025")).toBe(true);
  });

  it("matches lowercase 'fall' against a FALL term", () => {
    const course = makeCourse({ offeredIN: ["fall"] });
    expect(isOfferedIn(course, "FALL 2025")).toBe(true);
    expect(isOfferedIn(course, "WINTER 2025")).toBe(false);
  });

  it("matches uppercase 'WINTER' against a WINTER term", () => {
    const course = makeCourse({ offeredIN: ["WINTER"] });
    expect(isOfferedIn(course, "WINTER 2025")).toBe(true);
    expect(isOfferedIn(course, "FALL 2025")).toBe(false);
  });

  it("matches when multiple seasons are listed", () => {
    const course = makeCourse({ offeredIN: ["fall", "winter"] });
    expect(isOfferedIn(course, "FALL 2025")).toBe(true);
    expect(isOfferedIn(course, "WINTER 2026")).toBe(true);
    expect(isOfferedIn(course, "SUMMER 2025")).toBe(false);
  });
});

// ─── arePrereqsSatisfied ─────────────────────────────────────────────────────

describe("arePrereqsSatisfied", () => {
  it("returns true when the course has no prerequisites", () => {
    const course = makeCourse({ prerequisites: [] });
    expect(arePrereqsSatisfied(course, 0, [], {})).toBe(true);
  });

  it("returns true when a required prereq is completed", () => {
    const prereq = makeCourse({
      id: "COMP 101",
      status: { status: "completed", semester: null },
    });
    const course = makeCourse({ prerequisites: [{ anyOf: ["COMP 101"] }] });
    expect(arePrereqsSatisfied(course, 0, [], { "COMP 101": prereq })).toBe(true);
  });

  it("returns true when prereq is planned in an earlier semester", () => {
    const prereq = makeCourse({
      id: "COMP 101",
      status: { status: "planned", semester: "FALL 2024" },
    });
    const course = makeCourse({ prerequisites: [{ anyOf: ["COMP 101"] }] });
    const semesters: Semester[] = [
      { term: "FALL 2024", courses: [{ code: "COMP 101", message: "" }] },
      { term: "WINTER 2025", courses: [] },
    ];

    expect(
      arePrereqsSatisfied(course, 1, semesters, { "COMP 101": prereq })
    ).toBe(true);
  });

  it("returns false when prereq is planned in the same semester", () => {
    const prereq = makeCourse({
      id: "COMP 101",
      status: { status: "planned", semester: "WINTER 2025" },
    });
    const course = makeCourse({ prerequisites: [{ anyOf: ["COMP 101"] }] });
    const semesters: Semester[] = [
      { term: "FALL 2024", courses: [] },
      { term: "WINTER 2025", courses: [{ code: "COMP 101", message: "" }] },
    ];

    expect(
      arePrereqsSatisfied(course, 1, semesters, { "COMP 101": prereq })
    ).toBe(false);
  });

  it("returns false when prereq is incomplete", () => {
    const prereq = makeCourse({
      id: "COMP 101",
      status: { status: "incomplete", semester: null },
    });
    const course = makeCourse({ prerequisites: [{ anyOf: ["COMP 101"] }] });

    expect(arePrereqsSatisfied(course, 0, [], { "COMP 101": prereq })).toBe(
      false
    );
  });

  it("returns true for OR group when at least one option is satisfied", () => {
    const comp101 = makeCourse({
      id: "COMP 101",
      status: { status: "completed", semester: null },
    });
    const comp249 = makeCourse({
      id: "COMP 249",
      status: { status: "incomplete", semester: null },
    });
    // prereq group: COMP 101 OR COMP 249
    const course = makeCourse({
      prerequisites: [{ anyOf: ["COMP 101", "COMP 249"] }],
    });

    expect(
      arePrereqsSatisfied(course, 0, [], {
        "COMP 101": comp101,
        "COMP 249": comp249,
      })
    ).toBe(true);
  });
});
