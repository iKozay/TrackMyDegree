import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useTimelineState } from "../../hooks/useTimelineState";
import { TimelineActionConstants } from "../../types/actions";

vi.mock("../../api/http-api-client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("../../reducers/timelineReducer", () => ({
  timelineReducer: (state: any, action: any) => {
    if (action.type === TimelineActionConstants.Init) {
      return {
        ...state,
        ...action.payload,
        modal: { open: false, type: "" },
        history: [],
        future: [],
        selectedCourse: null,
      };
    }
    if (action.type === TimelineActionConstants.ChangeCourseStatus) {
      const { courseId, status } = action.payload;
      return {
        ...state,
        courses: {
          ...state.courses,
          [courseId]: {
            ...state.courses[courseId],
            status: {
              ...state.courses[courseId].status,
              status,
            },
          },
        },
      };
    }
    if (action.type === TimelineActionConstants.SetTimelineName) {
      return {
        ...state,
        timelineName: action.payload.timelineName,
      };
    }
    if (action.type === TimelineActionConstants.AddFallWinterSemester) {
      return {
        ...state,
        semesters: [
          ...state.semesters,
          { term: "FALL/WINTER 2025-26", courses: [] },
        ],
      };
    }
    if (action.type === TimelineActionConstants.MoveSemester) {
      const { fromIndex, toIndex } = action.payload;
      const semesters = [...state.semesters];
      const [moved] = semesters.splice(fromIndex, 1);
      semesters.splice(toIndex, 0, moved);
      return { ...state, semesters };
    }
    if (action.type === TimelineActionConstants.RemoveCourse) {
      const { courseId, type } = action.payload;
      const poolName = type === "exemption" ? "exemptions" : type === "deficiency" ? "deficiencies" : null;
      if (!poolName) return state;
      return {
        ...state,
        pools: state.pools.map((pool: any) =>
          pool.name === poolName
            ? { ...pool, courses: pool.courses.filter((c: string) => c !== courseId) }
            : pool,
        ),
        courses: {
          ...state.courses,
          [courseId]: {
            ...state.courses[courseId],
            status: { status: "incomplete", semester: null },
          },
        },
      };
    }
    return state;
  },
}));

import { api } from "../../api/http-api-client";

const POLL_INTERVAL = 1500;

const makeDoneResponse = (overrides: Record<string, any> = {}) => ({
  status: "done",
  result: {
    degree: { name: "CS", totalCredits: 90, coursePools: [] },
    pools: [],
    courses: {
      "COMP 248": {
        id: "COMP 248",
        title: "OOP",
        credits: 3,
        description: "",
        offeredIN: [],
        prerequisites: [],
        corequisites: [],
        status: { status: "completed", semester: "FALL 2025" },
      },
    },
    semesters: [{ term: "FALL 2025", courses: [] }],
    timelineName: "Saved Timeline",
    ...overrides,
  },
});

describe("useTimelineState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not poll when jobId is missing", () => {
    renderHook(() => useTimelineState(undefined));
    act(() => {
      vi.advanceTimersByTime(POLL_INTERVAL);
    });
    expect(api.get).not.toHaveBeenCalled();
  });

  it("initializes timeline state when job is done", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      status: "done",
      result: {
        degree: { name: "CS", totalCredits: 90, coursePools: [] },
        pools: [],
        courses: {
          "COMP 248": {
            id: "COMP 248",
            title: "OOP",
            credits: 3,
            description: "",
            offeredIn: [],
            prerequisites: [],
            corequisites: [],
            status: { status: "completed", semester: "FALL 2025" },
          },
        },
        semesters: [{ term: "FALL 2025", courses: [] }],
        timelineName: "Saved Timeline",
      },
    } as any);

    const { result } = renderHook(() => useTimelineState("job-1"));

    await act(async () => {});

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("done");
    expect(result.current.state.timelineName).toBe("Saved Timeline");
    expect(result.current.state.courses["COMP 248"]).toBeDefined();
  });

  it("fails immediately on network error", async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error("Network failure"));

    const { result } = renderHook(() => useTimelineState("job-err"));

    await act(async () => {});

    expect(result.current.status).toBe("failed");
    expect(result.current.errorMessage).toMatch(/unable to reach server/i);
  });

  it("shows expiration message for HTTP 410 errors", async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error("HTTP 410: Gone"));

    const { result } = renderHook(() => useTimelineState("job-410"));

    await act(async () => {});

    expect(result.current.status).toBe("failed");
    expect(result.current.errorMessage).toMatch(/expired/i);
  });

  it("fails when job status is failed", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ status: "failed" } as any);

    const { result } = renderHook(() => useTimelineState("job-fail"));

    await act(async () => {});

    expect(result.current.status).toBe("failed");
    expect(result.current.errorMessage).toMatch(/job failed/i);
  });

  it("polls while processing then resolves on done", async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ status: "processing" } as any)
      .mockResolvedValueOnce(makeDoneResponse() as any);

    const { result } = renderHook(() => useTimelineState("job-poll"));

    // First fetch — processing
    await act(async () => {});
    expect(result.current.status).toBe("processing");

    // Advance past the poll delay, let the next fetch resolve
    await act(async () => {
      vi.advanceTimersByTime(POLL_INTERVAL);
    });

    expect(api.get).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("done");
    expect(result.current.state.timelineName).toBe("Saved Timeline");
  });

  it("posts partial updates after state changes", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(
      makeDoneResponse({
        pools: [
          {
            _id: "exemptions",
            name: "exemptions",
            creditsRequired: 0,
            courses: [],
          },
          {
            _id: "deficiencies",
            name: "deficiencies",
            creditsRequired: 0,
            courses: [],
          },
        ],
        courses: {
          "COMP 248": {
            id: "COMP 248",
            title: "OOP",
            credits: 3,
            description: "",
            offeredIn: [],
            prerequisites: [],
            corequisites: [],
            status: { status: "completed", semester: "FALL 2025" },
          },
        },
        semesters: [{ term: "FALL 2025", courses: [] }],
        timelineName: "Saved Timeline",
      }));

    vi.mocked(api.post).mockResolvedValue({} as any);

    const { result } = renderHook(() => useTimelineState("job-3"));

    await act(async () => {});

    act(() => {
      result.current.actions.changeCourseStatus("COMP 248", "planned");
    });

    expect(api.post).toHaveBeenCalledWith(
      "/jobs/job-3",
      expect.objectContaining({
        courses: expect.any(Object),
      }),
    );
  });

  it("falls back to empty timelineName when missing", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(
      makeDoneResponse({
        timelineName: undefined,
        courses: {},
        semesters: [],
      }) as any,
    );

    const { result } = renderHook(() => useTimelineState("job-no-name"));

    await act(async () => {});

    expect(result.current.status).toBe("done");
    expect(result.current.state.timelineName).toBe("");
  });

  it("falls back to empty timelineName when null", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(
      makeDoneResponse({
        timelineName: null,
        courses: {},
        semesters: [],
      }) as any,
    );

    const { result } = renderHook(() => useTimelineState("job-null-name"));

    await act(async () => {});

    expect(result.current.status).toBe("done");
    expect(result.current.state.timelineName).toBe("");
  });

  it("updates timelineName via setTimelineName action", () => {
    const { result } = renderHook(() => useTimelineState(undefined));

    act(() => {
      result.current.actions.setTimelineName("My Timeline");
    });

    expect(result.current.state.timelineName).toBe("My Timeline");
  });

  it("dispatches removeCourse action for exemption pool", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(
      makeDoneResponse({
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
          "COMP 248": {
            id: "COMP 248",
            title: "OOP",
            credits: 3,
            description: "",
            offeredIn: [],
            status: { status: "completed", semester: null },
          },
        },
        semesters: [],
        timelineName: "Test",
      }) as any,
    );

    const { result } = renderHook(() => useTimelineState("job-remove"));

    await act(async () => {});

    act(() => {
      result.current.actions.removeCourse("COMP 248", "exemption");
    });

    expect(result.current.state.pools[0].courses).not.toContain("COMP 248");
    expect(result.current.state.courses["COMP 248"].status.status).toBe("incomplete");
  });

  it("dispatches removeCourse action for deficiency pool", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(
      makeDoneResponse({
        pools: [
          {
            _id: "deficiencies",
            name: "deficiencies",
            creditsRequired: 3,
            courses: ["COMP 248"],
            rules: [],
          },
        ],
        courses: {
          "COMP 248": {
            id: "COMP 248",
            title: "OOP",
            credits: 3,
            description: "",
            offeredIn: [],
            status: { status: "incomplete", semester: null },
          },
        },
        semesters: [],
        timelineName: "Test",
      }) as any,
    );

    const { result } = renderHook(() => useTimelineState("job-remove-def"));

    await act(async () => {});

    act(() => {
      result.current.actions.removeCourse("COMP 248", "deficiency");
    });

    expect(result.current.state.pools[0].courses).not.toContain("COMP 248");
    expect(result.current.state.courses["COMP 248"].status.status).toBe("incomplete");
  });

  it("dispatches addFallWinterSemester action", () => {
    const { result } = renderHook(() => useTimelineState(undefined));

    act(() => {
      result.current.actions.addFallWinterSemester();
    });

    expect(
      result.current.state.semesters.some((s) => s.term.startsWith("FALL/WINTER"))
    ).toBe(true);
  });

  it("dispatches moveSemester action", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(
      makeDoneResponse({
        semesters: [
          { term: "FALL 2025", courses: [] },
          { term: "FALL/WINTER 2025-26", courses: [] },
          { term: "WINTER 2026", courses: [] },
        ],
        courses: {},
        timelineName: "Test",
      }) as any,
    );

    const { result } = renderHook(() => useTimelineState("job-move"));

    await act(async () => {});

    act(() => {
      result.current.actions.moveSemester(1, 2);
    });

    // After moving index 1 → index 2, the FALL/WINTER term should be at position 2
    expect(result.current.state.semesters[2].term).toMatch(/^FALL\/WINTER/);
  });
});
