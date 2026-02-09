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
    offeredIN: ["FALL 2025", "WINTER 2026"],
    prerequisites: [],
    corequisites: [],
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
    offeredIN: ["WINTER 2026", "SUMMER 2026"],
    prerequisites: [],
    corequisites: [],
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
});
