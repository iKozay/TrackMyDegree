import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import CourseDetail from "../../components/CourseDetail";
import type {
  Course,
  CourseCode,
  CourseMap,
  CourseStatusValue,
  SemesterId,
  SemesterList,
} from "../../types/timeline.types";

const courseRulesMock = vi.fn();

vi.mock("../../components/CourseRules", () => ({
  default: (props: any) => {
    courseRulesMock(props);
    return (
      <div data-testid="course-rules">
        <span>CourseRules with {props.course?.rules?.length || 0} rules</span>
      </div>
    );
  },
}));

const makeCourse = (status: CourseStatusValue): Course => ({
  id: "COMP 248" as CourseCode,
  title: "Object-Oriented Programming I",
  credits: 3,
  description: "Intro to OOP",
  offeredIn: ["FALL 2025", "WINTER 2026"] as SemesterId[],
  rules: [
    {
      type: "prerequisite",
      level: "warning",
      message: "At least 1 of the following courses must be completed previously: MATH 203.",
      params: {
        courseList: ["MATH 203"],
        minCourses: 1
      }
    },
    {
      type: "corequisite",
      level: "warning",
      message: "At least 1 of the following courses must be completed previously or taken concurrently: ENCS 282.",
      params: {
        courseList: ["ENCS 282"],
        minCourses: 1
      }
    }
  ],
  status: {
    status,
    semester: "FALL 2025" as SemesterId,
  },
});

describe("CourseDetail", () => {
  beforeEach(() => {
    courseRulesMock.mockClear();
  });

  it("renders empty state when no course is provided", () => {
    render(<CourseDetail course={null} courses={{}} semesters={[]} />);

    expect(screen.getByText(/select a course/i)).toBeInTheDocument();
    expect(
      screen.getByText(/click on any course to view its details/i),
    ).toBeInTheDocument();

    // Should not render course header
    expect(screen.queryByText("COMP 248")).toBeNull();
  });

  it("renders basic course information when course is provided", () => {
    const course = makeCourse("incomplete");
    render(<CourseDetail course={course} courses={{}} semesters={[]} />);

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

  it("shows N/A when offeredIn is empty", () => {
    const course: Course = {
      ...makeCourse("incomplete"),
      offeredIn: [],
    };

    render(<CourseDetail course={course} courses={{}} semesters={[]} />);

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
      const { unmount } = render(<CourseDetail course={course} courses={{}} semesters={[]} />);

      expect(screen.getByText(expectedText[status])).toBeInTheDocument();
      unmount();
    });
  });

  it("passes course and rules to CourseRules", () => {
    const course = makeCourse("incomplete");
    const courses: CourseMap = {
      [course.id]: course,
    };
    const semesters: SemesterList = [
      {
        term: "FALL 2025",
        courses: [
          { code: "COMP 248", message: "" }
        ]
      }
    ];

    render(<CourseDetail course={course} courses={courses} semesters={semesters} />);

    // We mocked CourseRules so every render triggers courseRulesMock
    expect(courseRulesMock).toHaveBeenCalledTimes(1);

    const callArgs = courseRulesMock.mock.calls[0][0];

    // Check that CourseRules received the correct props
    expect(callArgs.course).toBe(course);
    expect(callArgs.courses).toBe(courses);
    expect(callArgs.semesters).toBe(semesters);
  });
});
