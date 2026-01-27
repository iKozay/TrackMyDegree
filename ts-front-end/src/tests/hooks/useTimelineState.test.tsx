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
    return state;
  },
}));

import { api } from "../../api/http-api-client";

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
      vi.advanceTimersByTime(1000);
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
            offeredIN: [],
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

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.status).toBe("done");
    expect(result.current.state.timelineName).toBe("Saved Timeline");
    expect(result.current.state.courses["COMP 248"]).toBeDefined();
  });

  it("sets errorMessage when job result expired", async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error("HTTP 410: Gone"));

    const { result } = renderHook(() => useTimelineState("job-2"));

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.status).toBe("error");
    expect(result.current.errorMessage).toMatch(/expired/i);
  });

  it("posts partial updates after state changes", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      status: "done",
      result: {
        degree: { name: "CS", totalCredits: 90, coursePools: [] },
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
            offeredIN: [],
            prerequisites: [],
            corequisites: [],
            status: { status: "completed", semester: "FALL 2025" },
          },
        },
        semesters: [{ term: "FALL 2025", courses: [] }],
        timelineName: "Saved Timeline",
      },
    } as any);

    vi.mocked(api.post).mockResolvedValue({} as any);

    const { result } = renderHook(() => useTimelineState("job-3"));

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    act(() => {
      result.current.actions.changeCourseStatus("COMP 248", "planned");
    });

    expect(api.post).toHaveBeenCalledWith(
      "/jobs/job-3",
      expect.objectContaining({
        courses: expect.any(Object),
      })
    );
  });
});
