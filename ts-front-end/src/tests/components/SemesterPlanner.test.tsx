import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

describe("SemesterPlanner", () => {
  const courses: CourseMap = {
    "COMP 248": {
      id: "COMP 248" as CourseCode,
      title: "Object-Oriented Programming I",
      credits: 3,
      description: "Intro OOP",
      offeredIN: [],
      prerequisites: [],
      corequisites: [],
      status: { status: "incomplete", semester: null },
    },
    "SOEN 228": {
      id: "SOEN 228" as CourseCode,
      title: "System Hardware",
      credits: 4,
      description: "Hardware course",
      offeredIN: [],
      prerequisites: [],
      corequisites: [],
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
  const onRemoveCourse = vi.fn();

  it("renders the header title and Add Semester button", () => {
    render(
      <SemesterPlanner
        semesters={semesters}
        courses={courses}
        onCourseSelect={onCourseSelect}
        selectedCourse={null}
        onRemoveCourse={onRemoveCourse}
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
        onRemoveCourse={onRemoveCourse}
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
        onRemoveCourse={onRemoveCourse}
      />
    );

    // We don't assert much here, just that it renders successfully
    expect(screen.getByText(/academic plan/i)).toBeInTheDocument();
  });
});
