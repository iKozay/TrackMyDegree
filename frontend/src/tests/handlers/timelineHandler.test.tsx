import { vi } from "vitest";
import {
    withPushedHistory,
    initTimelineState,
    selectCourse,
    moveFromPoolToSemester,
    moveBetweenSemesters,
    removeFromSemester,
    undo,
    redo,
    openModal,
    changeCourseStatus,
    addCourse,
    removeCourse,
    addSemester,
    rebuildSemesterTerms,
    moveSemester,
    addFallWinterSemester,
    removeSemester,
    insertSemesterAt,
    validateTimeline,
} from "../../handlers/timelineHandler";
import type { TimelineState, Semester } from "../../types/timeline.types";
import { getCourseValidationMessage } from "../../utils/timelineUtils";

vi.mock("../../utils/timelineUtils", () => ({
    getCourseValidationMessage: vi.fn(() => ""),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCourse(
    overrides: Partial<{
        credits: number;
        status: string;
        semester: string | null;
    }> = {},
) {
    return {
        credits: overrides.credits ?? 3,
        status: {
            status: overrides.status ?? "incomplete",
            semester: overrides.semester ?? null,
        },};
}

function makeState(overrides: Partial<TimelineState> = {}): TimelineState {
    return {
        timelineName: "Test Timeline",
        degree: { name: "CS", pools: [] } as any,
        pools: [],
        courses: {
            "CS101": makeCourse(),
            "CS102": makeCourse(),
        },
        semesters: [
            { term: "FALL 2024", courses: [] },
            { term: "WINTER 2025", courses: [] },
        ],
        selectedCourse: null,
        history: [],
        future: [],
        modal: { open: false, type: "" },
        ...overrides,
    } as TimelineState;
}

// ---------------------------------------------------------------------------
// withPushedHistory
// ---------------------------------------------------------------------------

describe("withPushedHistory", () => {
    it("pushes a snapshot of courses and semesters onto history", () => {
        const state = makeState();
        const next = withPushedHistory(state);
        expect(next.history).toHaveLength(1);
        expect(next.history[0].courses).toEqual(state.courses);
        expect(next.history[0].semesters).toEqual(state.semesters);
    });

    it("clears future", () => {
        const state = makeState({ future: [{ courses: {}, semesters: [] }] as any });
        const next = withPushedHistory(state);
        expect(next.future).toHaveLength(0);
    });

    it("accumulates multiple snapshots", () => {
        const state = makeState();
        const s1 = withPushedHistory(state);
        const s2 = withPushedHistory(s1);
        expect(s2.history).toHaveLength(2);
    });
});

// ---------------------------------------------------------------------------
// initTimelineState
// ---------------------------------------------------------------------------

describe("initTimelineState", () => {
    it("initialises state from payload and resets selectedCourse, history, future and modal", () => {
        const payload = {
            timelineName: "My Plan",
            degree: { name: "Math", pools: [] } as any,
            pools: [],
            courses: { "MA101": makeCourse() } as any,
            semesters: [{ term: "FALL 2025", courses: [] }] as any,
        };
        const result = initTimelineState(makeState(), payload);
        expect(result.timelineName).toBe("My Plan");
        expect(result.selectedCourse).toBeNull();
        expect(result.history).toEqual([]);
        expect(result.future).toEqual([]);
        expect(result.modal).toEqual({ open: false, type: "" });
    });
});

// ---------------------------------------------------------------------------
// selectCourse
// ---------------------------------------------------------------------------

describe("selectCourse", () => {
    it("sets selectedCourse to given courseId", () => {
        const state = makeState();
        const next = selectCourse(state, { courseId: "CS101" as any });
        expect(next.selectedCourse).toBe("CS101");
    });

    it("clears selectedCourse when null is passed", () => {
        const state = makeState({ selectedCourse: "CS101" as any });
        const next = selectCourse(state, { courseId: null });
        expect(next.selectedCourse).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// moveFromPoolToSemester
// ---------------------------------------------------------------------------

describe("moveFromPoolToSemester", () => {
    it("adds a course to the target semester and marks it as planned", () => {
        const state = makeState();
        const next = moveFromPoolToSemester(state, {
            courseId: "CS101" as any,
            toSemesterId: "FALL 2024" as any,
        });
        expect(next.semesters[0].courses).toContainEqual({ code: "CS101", message: "" });
        expect(next.courses["CS101"].status.status).toBe("planned");
        expect(next.courses["CS101"].status.semester).toBe("FALL 2024");
    });

    it("returns state unchanged when semester does not exist", () => {
        const state = makeState();
        const next = moveFromPoolToSemester(state, {
            courseId: "CS101" as any,
            toSemesterId: "SUMMER 2099" as any,
        });
        expect(next.semesters).toEqual(state.semesters);
    });

    it("does not add duplicate course to semester", () => {
        const state = makeState({
            semesters: [
                { term: "FALL 2024", courses: [{ code: "CS101" as any, message: "" }] },
            ],
        });
        const next = moveFromPoolToSemester(state, {
            courseId: "CS101" as any,
            toSemesterId: "FALL 2024" as any,
        });
        expect(next.semesters[0].courses).toHaveLength(1);
    });

    it("pushes history", () => {
        const state = makeState();
        const next = moveFromPoolToSemester(state, {
            courseId: "CS101" as any,
            toSemesterId: "FALL 2024" as any,
        });
        expect(next.history).toHaveLength(1);
    });
});

// ---------------------------------------------------------------------------
// moveBetweenSemesters
// ---------------------------------------------------------------------------

describe("moveBetweenSemesters", () => {
    it("moves course from one semester to another", () => {
        const state = makeState({
            semesters: [
                { term: "FALL 2024", courses: [{ code: "CS101" as any, message: "" }] },
                { term: "WINTER 2025", courses: [] },
            ],
        });
        const next = moveBetweenSemesters(state, {
            courseId: "CS101" as any,
            fromSemesterId: "FALL 2024" as any,
            toSemesterId: "WINTER 2025" as any,
        });
        expect(next.semesters[0].courses).toHaveLength(0);
        expect(next.semesters[1].courses).toContainEqual({ code: "CS101", message: "" });
        expect(next.courses["CS101"].status.semester).toBe("WINTER 2025");
    });

    it("returns state unchanged when from === to", () => {
        const state = makeState();
        const next = moveBetweenSemesters(state, {
            courseId: "CS101" as any,
            fromSemesterId: "FALL 2024" as any,
            toSemesterId: "FALL 2024" as any,
        });
        expect(next).toBe(state);
    });

    it("returns state unchanged when fromSemester does not contain the course", () => {
        const state = makeState();
        const next = moveBetweenSemesters(state, {
            courseId: "CS101" as any,
            fromSemesterId: "FALL 2024" as any,
            toSemesterId: "WINTER 2025" as any,
        });
        expect(next.semesters[0].courses).toHaveLength(0);
        expect(next.semesters[1].courses).toHaveLength(0);
    });

    it("does not duplicate course in destination semester", () => {
        const state = makeState({
            semesters: [
                { term: "FALL 2024", courses: [{ code: "CS101" as any, message: "" }] },
                { term: "WINTER 2025", courses: [{ code: "CS101" as any, message: "" }] },
            ],
        });
        const next = moveBetweenSemesters(state, {
            courseId: "CS101" as any,
            fromSemesterId: "FALL 2024" as any,
            toSemesterId: "WINTER 2025" as any,
        });
        expect(next.semesters[1].courses).toHaveLength(1);
    });
});

// ---------------------------------------------------------------------------
// removeFromSemester
// ---------------------------------------------------------------------------

describe("removeFromSemester", () => {
    it("removes course from semester and sets status to incomplete", () => {
        const state = makeState({
            semesters: [
                { term: "FALL 2024", courses: [{ code: "CS101" as any, message: "" }] },
                { term: "WINTER 2025", courses: [] },
            ],courses: {
                "CS101": makeCourse({ status: "planned", semester: "FALL 2024" }),
            } as any,
        });
        const next = removeFromSemester(state, {
            courseId: "CS101" as any,
            semesterId: "FALL 2024" as any,
        });
        expect(next.semesters[0].courses).toHaveLength(0);
        expect(next.courses["CS101"].status.status).toBe("incomplete");
        expect(next.courses["CS101"].status.semester).toBeNull();
    });

    it("returns state unchanged when semester not found", () => {
        const state = makeState();
        const next = removeFromSemester(state, {
            courseId: "CS101" as any,
            semesterId: "SUMMER 2099" as any,
        });
        expect(next.semesters).toEqual(state.semesters);
    });

    it("returns state unchanged when course not in semester", () => {
        const state = makeState();
        const next = removeFromSemester(state, {
            courseId: "CS101" as any,
            semesterId: "FALL 2024" as any,
        });
        expect(next.semesters[0].courses).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// undo / redo
// ---------------------------------------------------------------------------

describe("undo", () => {
    it("returns same state when history is empty", () => {
        const state = makeState();
        expect(undo(state)).toBe(state);
    });

    it("restores the last snapshot and moves current state to future", () => {
        const original = makeState();
        const afterMove = moveFromPoolToSemester(original, {
            courseId: "CS101" as any,
            toSemesterId: "FALL 2024" as any,
        });
        const undone = undo(afterMove);
        expect(undone.semesters[0].courses).toHaveLength(0);
        expect(undone.future).toHaveLength(1);
        expect(undone.history).toHaveLength(0);
    });
});

describe("redo", () => {
    it("returns same state when future is empty", () => {
        const state = makeState();
        expect(redo(state)).toBe(state);
    });

    it("re-applies the next future snapshot", () => {
        const original = makeState();
        const afterMove = moveFromPoolToSemester(original, {
            courseId: "CS101" as any,
            toSemesterId: "FALL 2024" as any,
        });
        const undone = undo(afterMove);
        const redone = redo(undone);
        expect(redone.semesters[0].courses).toHaveLength(1);
        expect(redone.future).toHaveLength(0);
        expect(redone.history).toHaveLength(1);
    });
});

// ---------------------------------------------------------------------------
// openModal
// ---------------------------------------------------------------------------

describe("openModal", () => {
    it("sets modal open and type", () => {
        const state = makeState();
        const next = openModal(state, { open: true, type: "add-course" });
        expect(next.modal).toEqual({ open: true, type: "add-course" });
    });

    it("closes modal", () => {
        const state = makeState({ modal: { open: true, type: "add-course" } });
        const next = openModal(state, { open: false, type: "" });
        expect(next.modal).toEqual({ open: false, type: "" });
    });
});

// ---------------------------------------------------------------------------
// changeCourseStatus
// ---------------------------------------------------------------------------

describe("changeCourseStatus", () => {
    it("marks course as completed", () => {
        const state = makeState();
        const next = changeCourseStatus(state, {
            courseId: "CS101" as any,
            status: "completed",
        });
        expect(next.courses["CS101"].status.status).toBe("completed");
    });

    it("marks course as incomplete and removes it from semesters", () => {
        const state = makeState({
            semesters: [
                { term: "FALL 2024", courses: [{ code: "CS101" as any, message: "" }] },
                { term: "WINTER 2025", courses: [] },
            ],
        });
        const next = changeCourseStatus(state, {
            courseId: "CS101" as any,
            status: "incomplete",
        });
        expect(next.courses["CS101"].status.status).toBe("incomplete");
        expect(next.courses["CS101"].status.semester).toBeNull();
        expect(next.semesters[0].courses).toHaveLength(0);
    });

    it("returns state unchanged when course does not exist", () => {
        const state = makeState();
        const next = changeCourseStatus(state, {
            courseId: "UNKNOWN" as any,
            status: "completed",
        });
        expect(next.courses).toEqual(state.courses);
    });

    it("pushes history", () => {
        const state = makeState();
        const next = changeCourseStatus(state, {
            courseId: "CS101" as any,
            status: "completed",
        });
        expect(next.history).toHaveLength(1);
    });
});

// ---------------------------------------------------------------------------
// addCourse / removeCourse
// ---------------------------------------------------------------------------

describe("addCourse", () => {
    const pool = { name: "exemptions", courses: [], creditsRequired: 0 };

    it("adds course to exemption pool and marks as completed", () => {
        const state = makeState({ pools: [pool] as any });
        const next = addCourse(state, { courseId: "CS101" as any, type: "exemption" });
        expect(next.pools[0].courses).toContain("CS101");
        expect(next.courses["CS101"].status.status).toBe("completed");
        expect(next.pools[0].creditsRequired).toBe(3);
    });

    it("adds course to deficiency pool and marks as incomplete", () => {
        const defPool = { name: "deficiencies", courses: [], creditsRequired: 0 };
        const state = makeState({ pools: [defPool] as any });
        const next = addCourse(state, { courseId: "CS101" as any, type: "deficiency" });
        expect(next.pools[0].courses).toContain("CS101");
        expect(next.courses["CS101"].status.status).toBe("incomplete");
    });

    it("returns state unchanged when type is unknown", () => {
        const state = makeState();
        const next = addCourse(state, { courseId: "CS101" as any, type: "unknown" });
        expect(next).toBe(state);
    });

    it("returns state unchanged when course already in pool", () => {
        const existingPool = { name: "exemptions", courses: ["CS101"], creditsRequired: 3 };
        const state = makeState({ pools: [existingPool] as any });
        const next = addCourse(state, { courseId: "CS101" as any, type: "exemption" });
        expect(next).toBe(state);
    });
});

describe("removeCourse", () => {
    const pool = { name: "exemptions", courses: ["CS101"], creditsRequired: 3 };

    it("removes course from pool and resets status to incomplete", () => {
        const state = makeState({
            pools: [pool] as any,
            courses: { "CS101": makeCourse({ status: "completed", credits: 3 }) } as any,
        });
        const next = removeCourse(state, { courseId: "CS101" as any, type: "exemption" });
        expect(next.pools[0].courses).not.toContain("CS101");
        expect(next.courses["CS101"].status.status).toBe("incomplete");
        expect(next.pools[0].creditsRequired).toBe(0);
    });

    it("returns state unchanged when course not in pool", () => {
        const emptyPool = { name: "exemptions", courses: [], creditsRequired: 0 };
        const state = makeState({ pools: [emptyPool] as any });
        const next = removeCourse(state, { courseId: "CS101" as any, type: "exemption" });
        expect(next).toBe(state);
    });

    it("returns state unchanged when type is unknown", () => {
        const state = makeState({ pools: [pool] as any });
        const next = removeCourse(state, { courseId: "CS101" as any, type: "unknown" });
        expect(next).toBe(state);
    });
});

// ---------------------------------------------------------------------------
// addSemester
// ---------------------------------------------------------------------------

describe("addSemester", () => {
    it("adds WINTER after FALL", () => {
        const state = makeState({
            semesters: [{ term: "FALL 2024", courses: [] }],
        });
        const next = addSemester(state);
        expect(next.semesters.at(-1)?.term).toBe("WINTER 2025");
    });

    it("adds SUMMER after WINTER", () => {
        const state = makeState({
            semesters: [{ term: "WINTER 2025", courses: [] }],
        });
        const next = addSemester(state);
        expect(next.semesters.at(-1)?.term).toBe("SUMMER 2025");
    });

    it("adds FALL after SUMMER", () => {
        const state = makeState({
            semesters: [{ term: "SUMMER 2025", courses: [] }],
        });
        const next = addSemester(state);
        expect(next.semesters.at(-1)?.term).toBe("FALL 2025");
    });

    it("does not add duplicate semester", () => {
        const state = makeState({
            semesters: [
                { term: "FALL 2024", courses: [] },
                { term: "WINTER 2025", courses: [] },
            ],
        });
        const next = addSemester(state);
        const count = next.semesters.filter((s) => s.term === "WINTER 2025").length;
        expect(count).toBe(1);
    });

    it("ignores FALL/WINTER semesters when finding last regular semester", () => {
        const state = makeState({
            semesters: [
                { term: "FALL 2024", courses: [] },
                { term: "FALL/WINTER 2024-25", courses: [] },
            ],
        });
        const next = addSemester(state);
        expect(next.semesters.at(-1)?.term).toBe("WINTER 2025");
    });
});

// ---------------------------------------------------------------------------
// rebuildSemesterTerms
// ---------------------------------------------------------------------------

describe("rebuildSemesterTerms", () => {
    it("returns empty array unchanged", () => {
        expect(rebuildSemesterTerms([])).toEqual([]);
    });

    it("does not rename regular semesters", () => {
        const semesters: Semester[] = [
            { term: "FALL 2024" as any, courses: [] },
            { term: "WINTER 2025" as any, courses: [] },
        ];
        expect(rebuildSemesterTerms(semesters)).toEqual(semesters);
    });

    it("renames FALL/WINTER semester based on preceding FALL", () => {
        const semesters: Semester[] = [
            { term: "FALL 2024" as any, courses: [] },
            { term: "FALL/WINTER 2023-24" as any, courses: [] }, // wrong year — should be corrected
        ];
        const result = rebuildSemesterTerms(semesters);
        expect(result[1].term).toBe("FALL/WINTER 2024-25");
    });

    it("renames FALL/WINTER semester based on following FALL when no preceding regular", () => {
        const semesters: Semester[] = [
            { term: "FALL/WINTER 2099-00" as any, courses: [] },
            { term: "FALL 2025" as any, courses: [] },
        ];
        const result = rebuildSemesterTerms(semesters);
        expect(result[0].term).toBe("FALL/WINTER 2025-26");
    });
});

// ---------------------------------------------------------------------------
// moveSemester
// ---------------------------------------------------------------------------

describe("moveSemester", () => {
    it("reorders semesters", () => {
        const state = makeState({
            semesters: [
                { term: "FALL 2024", courses: [] },
                { term: "WINTER 2025", courses: [] },
                { term: "SUMMER 2025", courses: [] },
            ],
        });
        const next = moveSemester(state, { fromIndex: 2, toIndex: 0 });
        expect(next.semesters[0].term).toBe("SUMMER 2025");
    });

    it("returns state unchanged when fromIndex === toIndex", () => {
        const state = makeState();
        expect(moveSemester(state, { fromIndex: 0, toIndex: 0 })).toBe(state);
    });

    it("returns state unchanged when fromIndex is out of bounds", () => {
        const state = makeState();
        expect(moveSemester(state, { fromIndex: 99, toIndex: 0 })).toBe(state);
    });

    it("updates course semester references when FALL/WINTER terms change", () => {
        const state = makeState({
            semesters: [
                { term: "WINTER 2025", courses: [{ code: "CS101" as any, message: "" }] },
                { term: "FALL/WINTER 2024-25", courses: [] },
                { term: "FALL 2025", courses: [] },
            ],
            courses: {
                "CS101": makeCourse({ status: "planned", semester: "WINTER 2025" }),
            } as any,
        });
        // moving FALL/WINTER before WINTER should not crash
        const next = moveSemester(state, { fromIndex: 1, toIndex: 0 });
        expect(next.semesters).toHaveLength(3);
    });
});

// ---------------------------------------------------------------------------
// addFallWinterSemester
// ---------------------------------------------------------------------------

describe("addFallWinterSemester", () => {
    it("adds a FALL/WINTER semester after the last semester", () => {
        const state = makeState({
            semesters: [{ term: "FALL 2024", courses: [] }],
        });
        const next = addFallWinterSemester(state);
        expect(next.semesters.at(-1)?.term).toMatch(/^FALL\/WINTER/);
    });

    it("does not add duplicate FALL/WINTER semester", () => {
        const state = makeState({
            semesters: [
                { term: "FALL 2024", courses: [] },
                { term: "FALL/WINTER 2024-25", courses: [] },
            ],
        });
        const next = addFallWinterSemester(state);
        const count = next.semesters.filter((s) =>
            s.term.startsWith("FALL/WINTER"),
        ).length;
        expect(count).toBe(1);
    });

    it("pushes history", () => {
        const state = makeState({
            semesters: [{ term: "FALL 2024", courses: [] }],
        });
        const next = addFallWinterSemester(state);
        expect(next.history).toHaveLength(1);
    });
});

// ---------------------------------------------------------------------------
// removeSemester
// ---------------------------------------------------------------------------

describe("removeSemester", () => {
    it("removes an empty semester", () => {
        const state = makeState();
        const next = removeSemester(state, { semesterId: "FALL 2024" as any });
        expect(next.semesters.some((s) => s.term === "FALL 2024")).toBe(false);
    });

    it("does not remove a semester that contains courses", () => {
        const state = makeState({
            semesters: [
                { term: "FALL 2024", courses: [{ code: "CS101" as any, message: "" }] },
            ],
        });
        const next = removeSemester(state, { semesterId: "FALL 2024" as any });
        expect(next.semesters).toHaveLength(1);
    });

    it("returns state unchanged when semester not found", () => {
        const state = makeState();
        const next = removeSemester(state, { semesterId: "SUMMER 2099" as any });
        expect(next.semesters).toEqual(state.semesters);
    });

    it("pushes history on successful remove", () => {
        const state = makeState();
        const next = removeSemester(state, { semesterId: "FALL 2024" as any });
        expect(next.history).toHaveLength(1);
    });
});

// ---------------------------------------------------------------------------
// insertSemesterAt
// ---------------------------------------------------------------------------

describe("insertSemesterAt", () => {
    it("inserts a new semester at the given index", () => {
        const state = makeState();
        const next = insertSemesterAt(state, {
            semesterId: "SUMMER 2024" as any,
            atIndex: 1,
        });
        expect(next.semesters[1].term).toBe("SUMMER 2024");
        expect(next.semesters).toHaveLength(3);
    });

    it("returns state unchanged when semester already exists", () => {
        const state = makeState();
        const next = insertSemesterAt(state, {
            semesterId: "FALL 2024" as any,
            atIndex: 0,
        });
        expect(next).toBe(state);
    });

    it("pushes history", () => {
        const state = makeState();
        const next = insertSemesterAt(state, {
            semesterId: "SUMMER 2024" as any,
            atIndex: 0,
        });
        expect(next.history).toHaveLength(1);
    });
});

// ---------------------------------------------------------------------------
// validateTimeline
// ---------------------------------------------------------------------------

describe("validateTimeline", () => {
    it("calls getCourseValidationMessage for each course in each semester", () => {
        const mockMessage = vi.mocked(getCourseValidationMessage);
        mockMessage.mockReturnValue("Missing prerequisite");

        const state = makeState({
            semesters: [
                {
                    term: "FALL 2024",
                    courses: [
                        { code: "CS101" as any, message: "" },
                        { code: "CS102" as any, message: "" },
                    ],
                },],
        });

        const next = validateTimeline(state);
        expect(mockMessage).toHaveBeenCalledTimes(2);
        expect(next.semesters[0].courses[0].message).toBe("Missing prerequisite");
        expect(next.semesters[0].courses[1].message).toBe("Missing prerequisite");
    });

    it("skips courses not found in courses map", () => {
        const mockMessage = getCourseValidationMessage as jest.Mock;
        mockMessage.mockReturnValue("ok");

        const state = makeState({
            semesters: [
                {
                    term: "FALL 2024",
                    courses: [{ code: "UNKNOWN" as any, message: "" }],
                },
            ],
        });

        const next = validateTimeline(state);
        expect(next.semesters[0].courses[0].message).toBe("");
    });

    it("does not mutate the original state", () => {
        const state = makeState({
            semesters: [
                {
                    term: "FALL 2024",
                    courses: [{ code: "CS101" as any, message: "" }],
                },
            ],
        });
        validateTimeline(state);
        expect(state.semesters[0].courses[0].message).toBe("");
    });
});
