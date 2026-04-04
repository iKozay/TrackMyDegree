import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RuleType, type Rule } from "@trackmydegree/shared";
import CourseRules from "../../components/CourseRules";
import type {
  Course,
  CourseMap,
  SemesterList,
} from "../../types/timeline.types";

const semesters: SemesterList = [
  { term: "FALL 2025", courses: [] },
  {
    term: "WINTER 2026",
    courses: [
      {
        code: "COMP 352",
        message:
          "At least 1 of the following courses must be completed previously: COMP 248.",
      },
    ],
  },
];

const courses: CourseMap = {
  "COMP 248": {
    id: "COMP 248",
    title: "Object-Oriented Programming I",
    credits: 3,
    description: "",
    offeredIn: ["FALL 2025"],
    rules: [],
    status: { status: "completed", semester: "FALL 2025" },
  },
  "COMP 352": {
    id: "COMP 352",
    title: "Data Structures and Algorithms",
    credits: 3,
    description: "",
    offeredIn: ["WINTER 2026"],
    rules: [],
    status: { status: "planned", semester: "WINTER 2026" },
  },
};

const prerequisiteRule: Rule = {
  type: RuleType.Prerequisite,
  level: "warning",
  message:
    "At least 1 of the following courses must be completed previously: COMP 248.",
  params: { courseList: ["COMP 248"], minCourses: 1 },
};

const baseCourse: Course = {
  id: "COMP 352",
  title: "Data Structures and Algorithms",
  credits: 3,
  description: "",
  offeredIn: ["WINTER 2026"],
  rules: [prerequisiteRule],
  status: { status: "planned", semester: "WINTER 2026" },
};

describe("CourseRules (new)", () => {
  it("returns null when course has no rules", () => {
    const { container } = render(
      <CourseRules
        course={{ ...baseCourse, rules: [] }}
        courses={courses}
        semesters={semesters}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders prerequisite section and course list", () => {
    render(
      <CourseRules
        course={baseCourse}
        courses={courses}
        semesters={semesters}
      />,
    );

    expect(screen.getByText("Prerequisites")).toBeInTheDocument();
  });

  it("marks violated rules as unsatisfied", () => {
    render(
      <CourseRules
        course={baseCourse}
        courses={courses}
        semesters={semesters}
      />,
    );

    const section = screen.getByText("Prerequisites").closest(".rule-section");
    expect(section).toHaveClass("section-unsatisfied");
  });

  it("collapses and expands section on header click", () => {
    render(
      <CourseRules
        course={baseCourse}
        courses={courses}
        semesters={semesters}
      />,
    );
    expect(screen.queryByText("COMP 248")).not.toBeInTheDocument();
    const header = screen.getByText("Prerequisites").closest(".rule-header");
    expect(header).not.toBeNull();

    fireEvent.click(header as HTMLElement);
    expect(screen.queryByText("COMP 248")).toBeInTheDocument();
  });
});
