import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import CourseDetail from "../../components/CourseDetail";
import type {
  Course,
  CourseCode,
  CourseMap,
  CourseStatusValue,
  SemesterId,
} from "../../types/timeline.types";

// 🔹 Mock RequisiteGroup so we don't test its internals here
const requisiteMock = vi.fn();

vi.mock("../../components/RequisiteGroup", () => ({
  RequisiteGroup: (props: any) => {
    requisiteMock(props);
    return (
      <div data-testid="requisite-group">
        <h4>{props.title}</h4>
        <span>
          {Array.isArray(props.groups) ? props.groups.length : 0} groups
        </span>
      </div>
    );
  },
}));

const makeCourse = (status: CourseStatusValue): Course => ({
  id: "COMP 248" as CourseCode,
  title: "Object-Oriented Programming I",
  credits: 3,
  description: "Intro to OOP",
  offeredIN: ["FALL 2025", "WINTER 2026"] as SemesterId[],
  prerequisites: [{ anyOf: ["MATH 203", "MATH 204"] }],
  corequisites: [{ anyOf: ["ENCS 282"] }],
  status: {
    status,
    semester: "FALL 2025" as SemesterId,
  },
});

describe("CourseDetail", () => {
  beforeEach(() => {
    requisiteMock.mockClear();
  });

  it("renders empty state when no course is provided", () => {
    render(<CourseDetail course={null} courses={{}} />);

    expect(screen.getByText(/select a course/i)).toBeInTheDocument();
    expect(
      screen.getByText(/click on any course to view its details/i),
    ).toBeInTheDocument();

    // Should not render course header
    expect(screen.queryByText("COMP 248")).toBeNull();
  });

  it("renders basic course information when course is provided", () => {
    const course = makeCourse("incomplete");
    render(<CourseDetail course={course} courses={{}} />);

    // Header id
    expect(screen.getByText("COMP 248")).toBeInTheDocument();
    // Title
    expect(
      screen.getByText("Object-Oriented Programming I"),
    ).toBeInTheDocument();
    // Credits
    expect(screen.getByText(/3 Credits/i)).toBeInTheDocument();
    // Offered in
    expect(screen.getByText(/Offered in:/i).textContent).toContain(
      "FALL 2025, WINTER 2026",
    );
    // Scheduled semester
    expect(screen.getByText(/Scheduled: FALL 2025/i)).toBeInTheDocument();
  });

  it("shows N/A when offeredIN is empty", () => {
    const course: Course = {
      ...makeCourse("incomplete"),
      offeredIN: [],
    };

    render(<CourseDetail course={course} courses={{}} />);

    expect(screen.getByText(/Offered in:/i).textContent).toContain("N/A");
  });

  it("renders correct status text for each status", () => {
    const statuses: CourseStatusValue[] = [
      "completed",
      "planned",
      "incomplete",
    ];

    const expectedText: Record<CourseStatusValue, string> = {
      completed: "Completed",
      planned: "Planned",
      incomplete: "Incomplete",
    };

    statuses.forEach((status) => {
      const course = makeCourse(status);
      const { unmount } = render(<CourseDetail course={course} courses={{}} />);

      expect(screen.getByText(expectedText[status])).toBeInTheDocument();
      unmount();
    });
  });

  it("passes prerequisites and corequisites to RequisiteGroup", () => {
    const course = makeCourse("incomplete");
    const courses: CourseMap = {
      [course.id]: course,
    };

    render(<CourseDetail course={course} courses={courses} />);

    // We mocked RequisiteGroup so every render triggers requisiteMock
    expect(requisiteMock).toHaveBeenCalledTimes(2);

    const [prereqCall, coreqCall] = requisiteMock.mock.calls;

    // First call: "Prerequisites"
    expect(prereqCall[0].title).toBe("Prerequisites");
    expect(prereqCall[0].groups).toEqual(course.prerequisites);
    expect(prereqCall[0].courses).toBe(courses);

    // Second call: "Corequisites"
    expect(coreqCall[0].title).toBe("Corequisites");
    expect(coreqCall[0].groups).toEqual(course.corequisites);
    expect(coreqCall[0].courses).toBe(courses);
  });
});
