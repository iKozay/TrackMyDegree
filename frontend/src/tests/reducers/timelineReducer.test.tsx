import { describe, it, expect } from "vitest";
import { timelineReducer } from "../../reducers/timelineReducer";
import { TimelineActionConstants } from "../../types/actions";
import type { TimelineState, CourseMap, SemesterList } from "../../types/timeline.types";

const mockCourses: CourseMap = {
  "COMP 248": {
    id: "COMP 248",
    title: "Object-Oriented Programming I",
    credits: 3,
    description: "Introduction to programming",
    offeredIn: ["FALL 2025", "WINTER 2026"],
    rules: [],
    status: {
      status: "incomplete",
      semester: null,
    },
  },
  "COMP 249": {
    id: "COMP 249",
    title: "Object-Oriented Programming II",
    credits: 3,
    description: "Advanced OOP concepts",
    offeredIn: ["WINTER 2026", "SUMMER 2026"],
    rules: [],
    status: {
      status: "incomplete",
      semester: null,
    },
  },
};

const mockSemesters: SemesterList = [
  {
    term: "FALL 2025",
    courses: [],
  },
  {
    term: "WINTER 2026",
    courses: [],
  },
];

const initialState: TimelineState = {
  timelineName: "Test Timeline",
  degree: {
    name: "BEng in Software Engineering",
    totalCredits: 120,
    coursePools: ["Engineering Core"],
  },
  pools: [
    {
      _id: "pool-engr-reducer",
      name: "Engineering Core",
      creditsRequired: 30,
      courses: ["COMP 248", "COMP 249"],
      rules: [],
    },
  ],
  courses: mockCourses,
  semesters: mockSemesters,
  selectedCourse: null,
  history: [],
  future: [],
  modal: {
    open: false,
    type: "",
  },
};

describe("timelineReducer", () => {
  it("returns initial state when action type is unknown", () => {
    const result = timelineReducer(initialState, { type: "UNKNOWN" } as any);
    expect(result).toEqual(initialState);
  });

  it("handles INIT action", () => {
    const emptyState: TimelineState = {
      ...initialState,
      timelineName: "",
      courses: {},
      semesters: [],
    };

    const action = {
      type: TimelineActionConstants.Init,
      payload: {
        timelineName: "New Timeline",
        degree: initialState.degree,
        pools: initialState.pools,
        courses: mockCourses,
        semesters: mockSemesters,
      },
    };

    const result = timelineReducer(emptyState, action);

    expect(result.timelineName).toBe("New Timeline");
    expect(result.courses).toEqual(mockCourses);
    expect(result.semesters).toEqual(mockSemesters);
  });

  it("handles SELECT_COURSE action", () => {
    const action = {
      type: TimelineActionConstants.SelectCourse,
      payload: { courseId: "COMP 248" },
    };

    const result = timelineReducer(initialState, action);

    expect(result.selectedCourse).toBe("COMP 248");
  });

  it("handles SELECT_COURSE action with null (deselect)", () => {
    const stateWithSelection = {
      ...initialState,
      selectedCourse: "COMP 248",
    };

    const action = {
      type: TimelineActionConstants.SelectCourse,
      payload: { courseId: null },
    };

    const result = timelineReducer(stateWithSelection, action);

    expect(result.selectedCourse).toBeNull();
  });

  it("handles MOVE_FROM_POOL_TO_SEMESTER action", () => {
    const action = {
      type: TimelineActionConstants.MoveFromPoolToSemester,
      payload: {
        courseId: "COMP 248",
        toSemesterId: "FALL 2025" as const,
      },
    };

    const result = timelineReducer(initialState, action);

    expect(result.courses["COMP 248"].status.semester).toBe("FALL 2025");
    expect(result.courses["COMP 248"].status.status).toBe("planned");
  });

  it("handles OPEN_MODAL action", () => {
    const action = {
      type: TimelineActionConstants.OpenModal,
      payload: { open: true, type: "insights" },
    };

    const result = timelineReducer(initialState, action);

    expect(result.modal.open).toBe(true);
    expect(result.modal.type).toBe("insights");
  });

  it("handles CHANGE_COURSE_STATUS action", () => {
    const action = {
      type: TimelineActionConstants.ChangeCourseStatus,
      payload: {
        courseId: "COMP 248",
        status: "completed" as const,
      },
    };

    const result = timelineReducer(initialState, action);

    expect(result.courses["COMP 248"].status.status).toBe("completed");
  });

  it("handles REMOVE_FROM_SEMESTER action", () => {
    const stateWithCourseInSemester: TimelineState = {
      ...initialState,
      courses: {
        ...mockCourses,
        "COMP 248": {
          ...mockCourses["COMP 248"],
          status: {
            status: "planned",
            semester: "FALL 2025",
          },
        },
      },
      semesters: [
        {
          term: "FALL 2025",
          courses: [{ code: "COMP 248", message: "" }],
        },
        {
          term: "WINTER 2026",
          courses: [],
        },
      ],
    };

    const action = {
      type: TimelineActionConstants.RemoveFromSemester,
      payload: {
        courseId: "COMP 248",
        semesterId: "FALL 2025" as const,
      },
    };

    const result = timelineReducer(stateWithCourseInSemester, action);

    expect(result.courses["COMP 248"].status.semester).toBeNull();
    expect(result.courses["COMP 248"].status.status).toBe("incomplete");
  });

  it("handles ADD_SEMESTER action", () => {
    const action = {
      type: TimelineActionConstants.AddSemester,
    };

    const result = timelineReducer(initialState, action);

    expect(result.semesters.length).toBe(initialState.semesters.length + 1);
  });

  it("handles UNDO action", () => {
    const stateWithHistory: TimelineState = {
      ...initialState,
      selectedCourse: "COMP 249",
      history: [
        {
          courses: mockCourses,
          semesters: mockSemesters,
        },
      ],
      future: [],
    };

    const action = {
      type: TimelineActionConstants.Undo,
    };

    const result = timelineReducer(stateWithHistory, action);

    expect(result.history.length).toBe(0);
    expect(result.future.length).toBe(1);
  });

  it("handles REDO action", () => {
    const stateWithFuture: TimelineState = {
      ...initialState,
      history: [],
      future: [
        {
          courses: mockCourses,
          semesters: mockSemesters,
        },
      ],
    };

    const action = {
      type: TimelineActionConstants.Redo,
    };

    const result = timelineReducer(stateWithFuture, action);

    expect(result.history.length).toBe(1);
    expect(result.future.length).toBe(0);
  });

  it("handles SET_TIMELINE_NAME action", () => {
      const action = {
          type: TimelineActionConstants.SetTimelineName,
          payload: { timelineName: "My Saved Timeline" },
      };
     const result = timelineReducer(initialState, action);
     expect(result.timelineName).toBe("My Saved Timeline");
      // Ensure unrelated state is unchanged
      expect(result.degree).toEqual(initialState.degree);
      expect(result.pools).toEqual(initialState.pools);
      expect(result.courses).toEqual(initialState.courses);
      expect(result.semesters).toEqual(initialState.semesters);
      expect(result.selectedCourse).toBe(initialState.selectedCourse);
      expect(result.modal).toEqual(initialState.modal);
  });

  it("handles REMOVE_COURSE action for exemption pool", () => {
    const stateWithExemption: TimelineState = {
      ...initialState,
      pools: [
        {
          _id: "exemptions",
          name: "exemptions",
          creditsRequired: 3,
          courses: ["COMP 248"],
          rules: [],
        },
      ],
      courses: {
        ...mockCourses,
        "COMP 248": {
          ...mockCourses["COMP 248"],
          status: { status: "completed", semester: null },
        },
      },
    };

    const action = {
      type: TimelineActionConstants.RemoveCourse,
      payload: { courseId: "COMP 248", type: "exemption" },
    };

    const result = timelineReducer(stateWithExemption, action);

    expect(result.pools[0].courses).not.toContain("COMP 248");
    expect(result.pools[0].creditsRequired).toBe(0);
    expect(result.courses["COMP 248"].status.status).toBe("incomplete");
    expect(result.courses["COMP 248"].status.semester).toBeNull();
  });

  it("handles REMOVE_COURSE action for deficiency pool", () => {
    const stateWithDeficiency: TimelineState = {
      ...initialState,
      pools: [
        {
          _id: "deficiencies",
          name: "deficiencies",
          creditsRequired: 3,
          courses: ["COMP 249"],
          rules: [],
        },
      ],
      courses: {
        ...mockCourses,
        "COMP 249": {
          ...mockCourses["COMP 249"],
          status: { status: "incomplete", semester: null },
        },
      },
    };

    const action = {
      type: TimelineActionConstants.RemoveCourse,
      payload: { courseId: "COMP 249", type: "deficiency" },
    };

    const result = timelineReducer(stateWithDeficiency, action);

    expect(result.pools[0].courses).not.toContain("COMP 249");
    expect(result.pools[0].creditsRequired).toBe(0);
    expect(result.courses["COMP 249"].status.status).toBe("incomplete");
  });

  it("does not modify state when REMOVE_COURSE targets invalid type", () => {
    const action = {
      type: TimelineActionConstants.RemoveCourse,
      payload: { courseId: "COMP 248", type: "invalid-type" },
    };

    const result = timelineReducer(initialState, action);

    expect(result.pools).toEqual(initialState.pools);
    expect(result.courses).toEqual(initialState.courses);
  });

  it("does not modify state when REMOVE_COURSE targets course not in pool", () => {
    const stateWithEmptyExemptions: TimelineState = {
      ...initialState,
      pools: [
        {
          _id: "exemptions",
          name: "exemptions",
          creditsRequired: 0,
          courses: [],
          rules: [],
        },
      ],
    };

    const action = {
      type: TimelineActionConstants.RemoveCourse,
      payload: { courseId: "COMP 248", type: "exemption" },
    };

    const result = timelineReducer(stateWithEmptyExemptions, action);

    expect(result).toEqual(stateWithEmptyExemptions);
  });

  it("handles ADD_FALL_WINTER_SEMESTER action", () => {
    const action = {
      type: TimelineActionConstants.AddFallWinterSemester,
    };

    const result = timelineReducer(initialState, action);

    expect(result.semesters.length).toBe(initialState.semesters.length + 1);

    const newSemester = result.semesters[result.semesters.length - 1];
    expect(newSemester.term).toMatch(/^FALL\/WINTER \d{4}-\d{2}$/);
  });

  it("does not add a duplicate FALL/WINTER semester", () => {
    // Add it once
    const action = { type: TimelineActionConstants.AddFallWinterSemester };
    const afterFirst = timelineReducer(initialState, action);
    // Try to add the same term again
    const afterSecond = timelineReducer(afterFirst, action);

    // Count FALL/WINTER semesters
    const fwCount = afterSecond.semesters.filter((s) =>
      s.term.startsWith("FALL/WINTER")
    ).length;
    expect(fwCount).toBe(1);
    expect(afterSecond.semesters.length).toBe(afterFirst.semesters.length);
  });

  it("handles MOVE_SEMESTER action to reorder semesters", () => {
    const stateWithFallWinter: TimelineState = {
      ...initialState,
      semesters: [
        { term: "FALL 2025", courses: [] },
        { term: "FALL/WINTER 2025-26", courses: [] },
        { term: "WINTER 2026", courses: [] },
      ],
    };

    const action = {
      type: TimelineActionConstants.MoveSemester,
      payload: { fromIndex: 1, toIndex: 2 },
    };

    const result = timelineReducer(stateWithFallWinter, action);

    expect(result.semesters.length).toBe(3);
    // FALL/WINTER should now be at index 2
    expect(result.semesters[2].term).toMatch(/^FALL\/WINTER/);
  });

  it("does not change state for MOVE_SEMESTER when fromIndex equals toIndex", () => {
    const action = {
      type: TimelineActionConstants.MoveSemester,
      payload: { fromIndex: 0, toIndex: 0 },
    };

    const result = timelineReducer(initialState, action);
    // State returned unchanged (no history push)
    expect(result.semesters).toEqual(initialState.semesters);
  });

  it("handles INSERT_SEMESTER_AT by inserting a new semester at the given index", () => {
    // initialState has [FALL 2025, WINTER 2026]; insert SUMMER 2026 at index 2
    const action = {
      type: TimelineActionConstants.InsertSemesterAt,
      payload: { semesterId: "SUMMER 2026", atIndex: 2 },
    };

    const result = timelineReducer(initialState, action);

    expect(result.semesters.length).toBe(3);
    expect(result.semesters[2].term).toBe("SUMMER 2026");
    expect(result.semesters[2].courses).toEqual([]);
  });

  it("handles INSERT_SEMESTER_AT by inserting in the middle of the list", () => {
    // initialState has [FALL 2025, WINTER 2026]; insert FALL 2025's missing would be e.g. a SUMMER
    // Insert a semester at index 1 between the two existing ones
    const action = {
      type: TimelineActionConstants.InsertSemesterAt,
      payload: { semesterId: "SUMMER 2025" as const, atIndex: 1 },
    };

    const result = timelineReducer(initialState, action);

    expect(result.semesters.length).toBe(3);
    expect(result.semesters[0].term).toBe("FALL 2025");
    expect(result.semesters[1].term).toBe("SUMMER 2025");
    expect(result.semesters[2].term).toBe("WINTER 2026");
  });

  it("does not insert a duplicate semester for INSERT_SEMESTER_AT", () => {
    const action = {
      type: TimelineActionConstants.InsertSemesterAt,
      payload: { semesterId: "FALL 2025" as const, atIndex: 1 },
    };

    const result = timelineReducer(initialState, action);

    expect(result.semesters.length).toBe(initialState.semesters.length);
  });

  it("pushes to history on INSERT_SEMESTER_AT", () => {
    const action = {
      type: TimelineActionConstants.InsertSemesterAt,
      payload: { semesterId: "SUMMER 2026" as const, atIndex: 2 },
    };

    const result = timelineReducer(initialState, action);
    expect(result.history.length).toBe(1);
  });
});
