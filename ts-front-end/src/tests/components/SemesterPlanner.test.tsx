import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SemesterPlanner from "../../components/SemesterPlanner";
import type {
  CourseMap,
  SemesterList,
  CourseCode,
  SemesterId,
} from "../../types/timeline.types";

// 🔹 Mock DroppableSemester so we don't have to render dnd-kit stuff
vi.mock("../../components/DroppableSemester", () => {
  return {
    DroppableSemester: ({ semesterId }: { semesterId: SemesterId }) => (
      <div data-testid="droppable-semester">{semesterId}</div>
    ),
  };
});

// 🔹 Mock useDroppable used by SemesterSlot inside SemesterPlanner
vi.mock("@dnd-kit/core", () => ({
  useDroppable: vi.fn(() => ({ isOver: false, setNodeRef: vi.fn() })),
}));

// 🔹 Mock useTimelineDnd context (needed by SemesterPlanner)
vi.mock("../../contexts/timelineDndContext", () => ({
  useTimelineDnd: vi.fn(() => ({ activeCourseId: null, activeSemesterId: null })),
}));

// 🔹 Mock react-toastify
vi.mock("react-toastify", () => ({
  toast: {
    warning: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// 🔹 Mock wouldCreateDuplicateFallWinter so we can control its return value
vi.mock("../../utils/timelineUtils", () => ({
  wouldCreateDuplicateFallWinter: vi.fn(() => false),
}));

import { useTimelineDnd } from "../../contexts/timelineDndContext";
import { toast } from "react-toastify";
import { wouldCreateDuplicateFallWinter } from "../../utils/timelineUtils";

describe("SemesterPlanner", () => {
  const courses: CourseMap = {
    "COMP 248": {
      id: "COMP 248" as CourseCode,
      title: "Object-Oriented Programming I",
      credits: 3,
      description: "Intro OOP",
      offeredIn: [],
      rules: [],
      status: { status: "incomplete", semester: null },
    },
    "SOEN 228": {
      id: "SOEN 228" as CourseCode,
      title: "System Hardware",
      credits: 4,
      description: "Hardware course",
      offeredIn: [],
      rules: [],
      status: { status: "incomplete", semester: null },
    },
  };

  const semesters: SemesterList = [
    {
      term: "FALL 2025",
      courses: [{ code: "COMP 248", message: "" }],
    },
    {
      term: "WINTER 2026",
      courses: [{ code: "SOEN 228", message: "" }],
    },
  ];

  const onCourseSelect = vi.fn();
  const onAddSemester = vi.fn();
  const onAddFallWinterSemester = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the header title and Add Semester button", () => {
    render(
      <SemesterPlanner
        semesters={semesters}
        courses={courses}
        onCourseSelect={onCourseSelect}
        selectedCourse={null}
        onAddSemester={onAddSemester}
        onAddFallWinterSemester={onAddFallWinterSemester}
      />
    );

    // Title
    expect(screen.getByText(/academic plan/i)).toBeInTheDocument();

    // Add Semester button
    expect(
      screen.getByRole("button", { name: /add semester/i })
    ).toBeInTheDocument();
  });

  it("renders a DroppableSemester for each semester in the map", () => {
    render(
      <SemesterPlanner
        semesters={semesters}
        courses={courses}
        onCourseSelect={onCourseSelect}
        selectedCourse={null}
        onAddSemester={onAddSemester}
        onAddFallWinterSemester={onAddFallWinterSemester}
      />
    );

    const droppableSemesters = screen.getAllByTestId("droppable-semester");
    expect(droppableSemesters).toHaveLength(2);

    // Check that the ids are rendered
    expect(screen.getByText("FALL 2025")).toBeInTheDocument();
    expect(screen.getByText("WINTER 2026")).toBeInTheDocument();
  });

  it("passes selectedCourse through without crashing", () => {
    render(
      <SemesterPlanner
        semesters={semesters}
        courses={courses}
        onCourseSelect={onCourseSelect}
        selectedCourse={"COMP 248"}
        onAddSemester={onAddSemester}
        onAddFallWinterSemester={onAddFallWinterSemester}
      />
    );

    // We don't assert much here, just that it renders successfully
    expect(screen.getByText(/academic plan/i)).toBeInTheDocument();
  });

  it("shows default header when timelineName is undefined", () => {
    render(
      <SemesterPlanner
        semesters={semesters}
        courses={courses}
        onCourseSelect={onCourseSelect}
        selectedCourse={null}
        onAddSemester={onAddSemester}
        onAddFallWinterSemester={onAddFallWinterSemester}
        timelineName={undefined}
      />
    );
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Academic Plan"
    );
  });

  it("shows provided timelineName in header when defined", () => {
    render(
      <SemesterPlanner
        semesters={semesters}
        courses={courses}
        onCourseSelect={onCourseSelect}
        selectedCourse={null}
        onAddSemester={onAddSemester}
        onAddFallWinterSemester={onAddFallWinterSemester}
        timelineName={"MyTimeline12345"}
      />
    );
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "MyTimeline12345"
    );
  });

  it("opens popover and shows both semester options when Add Semester is clicked", () => {
    render(
      <SemesterPlanner
        semesters={semesters}
        courses={courses}
        onCourseSelect={onCourseSelect}
        selectedCourse={null}
        onAddSemester={onAddSemester}
        onAddFallWinterSemester={onAddFallWinterSemester}
      />
    );

    // Popover should not be visible initially
    expect(screen.queryByRole("menu")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /add semester/i }));

    // Popover open
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /add semester/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /add fall\/winter semester/i })).toBeInTheDocument();
  });

  it("calls onAddSemester and closes popover when 'Add Semester' menu item is clicked", () => {
    render(
      <SemesterPlanner
        semesters={semesters}
        courses={courses}
        onCourseSelect={onCourseSelect}
        selectedCourse={null}
        onAddSemester={onAddSemester}
        onAddFallWinterSemester={onAddFallWinterSemester}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /add semester/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /^add semester/i }));

    expect(onAddSemester).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("calls onAddFallWinterSemester and closes popover when 'Add Fall/Winter Semester' is clicked", () => {
    render(
      <SemesterPlanner
        semesters={semesters}
        courses={courses}
        onCourseSelect={onCourseSelect}
        selectedCourse={null}
        onAddSemester={onAddSemester}
        onAddFallWinterSemester={onAddFallWinterSemester}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /add semester/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /add fall\/winter semester/i }));

    expect(onAddFallWinterSemester).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("renders semester drop slots when a semester card is being dragged", () => {
    (useTimelineDnd as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      activeCourseId: null,
      activeSemesterId: "FALL/WINTER 2025-26" as SemesterId,
    });

    const { container } = render(
      <SemesterPlanner
        semesters={semesters}
        courses={courses}
        onCourseSelect={onCourseSelect}
        selectedCourse={null}
        onAddSemester={onAddSemester}
        onAddFallWinterSemester={onAddFallWinterSemester}
      />
    );

    // SemesterSlot elements are rendered when isSemesterDragging is true
    const slots = container.querySelectorAll(".semester-drop-slot");
    // semesters.length + 1 trailing slot = 3 slots
    expect(slots.length).toBe(semesters.length + 1);
  });

  it("does not render semester drop slots when no semester is being dragged", () => {
    (useTimelineDnd as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      activeCourseId: null,
      activeSemesterId: null,
    });

    const { container } = render(
      <SemesterPlanner
        semesters={semesters}
        courses={courses}
        onCourseSelect={onCourseSelect}
        selectedCourse={null}
        onAddSemester={onAddSemester}
        onAddFallWinterSemester={onAddFallWinterSemester}
      />
    );

    const slots = container.querySelectorAll(".semester-drop-slot");
    expect(slots.length).toBe(0);
  });

  it("shows toast warning and does NOT call onAddFallWinterSemester when duplicate would be created", () => {
    vi.mocked(wouldCreateDuplicateFallWinter).mockReturnValueOnce(true);

    render(
      <SemesterPlanner
        semesters={semesters}
        courses={courses}
        onCourseSelect={onCourseSelect}
        selectedCourse={null}
        onAddSemester={onAddSemester}
        onAddFallWinterSemester={onAddFallWinterSemester}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /add semester/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /add fall\/winter semester/i }));

    expect(toast.warning).toHaveBeenCalledWith(
      "Only one Fall/Winter semester is allowed per academic year",
    );
    expect(onAddFallWinterSemester).not.toHaveBeenCalled();
    // Popover should close after the warning
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("calls onAddFallWinterSemester and does NOT show a toast when no duplicate would be created", () => {
    vi.mocked(wouldCreateDuplicateFallWinter).mockReturnValueOnce(false);

    render(
      <SemesterPlanner
        semesters={semesters}
        courses={courses}
        onCourseSelect={onCourseSelect}
        selectedCourse={null}
        onAddSemester={onAddSemester}
        onAddFallWinterSemester={onAddFallWinterSemester}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /add semester/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /add fall\/winter semester/i }));

    expect(onAddFallWinterSemester).toHaveBeenCalledTimes(1);
    expect(toast.warning).not.toHaveBeenCalled();
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
