import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RequisiteGroup } from "../../components/RequisiteGroup";
import type {
  CourseMap,
  CourseCode,
  SemesterId,
} from "../../types/timeline.types";

describe("RequisiteGroup", () => {
  it("returns null when groups is empty", () => {
    const { container } = render(
      <RequisiteGroup title="Prerequisites" groups={[]} courses={{}} />
    );

    // component returns null → nothing rendered
    expect(container.firstChild).toBeNull();
  });

  it("returns null when groups is not an array (e.g. string)", () => {
    const { container } = render(
      <RequisiteGroup title="Prerequisites" groups={"None"} courses={{}} />
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders title and prerequisite codes when groups are provided", () => {
    const groups = [
      { anyOf: ["COMP 248", "COMP 249"] },
      { anyOf: ["MATH 203"] },
    ];

    render(
      <RequisiteGroup
        title="Prerequisites"
        groups={groups}
        courses={{}} // no course data needed for this test
      />
    );

    // Title
    expect(screen.getByText(/prerequisites/i)).toBeInTheDocument();

    // Codes
    expect(screen.getByText("COMP 248")).toBeInTheDocument();
    expect(screen.getByText("COMP 249")).toBeInTheDocument();
    expect(screen.getByText("MATH 203")).toBeInTheDocument();
  });

  it("applies status-* class based on course status", () => {
    const groups = [{ anyOf: ["COMP 248", "MATH 203"] }];

    const courses: CourseMap = {
      "COMP 248": {
        id: "COMP 248" as CourseCode,
        title: "Object-Oriented Programming I",
        credits: 3,
        description: "",
        offeredIN: [] as SemesterId[],
        prerequisites: [],
        corequisites: [],
        status: {
          status: "completed",
          semester: "FALL 2025" as SemesterId,
        },
      },
      // MATH 203 intentionally omitted to trigger status-unknown
    };

    const { container } = render(
      <RequisiteGroup title="Prerequisites" groups={groups} courses={courses} />
    );

    const items = container.querySelectorAll(".prereq-item");
    expect(items.length).toBe(2);

    const comp248Item = Array.from(items).find((el) =>
      el.textContent?.includes("COMP 248")
    );
    const math203Item = Array.from(items).find((el) =>
      el.textContent?.includes("MATH 203")
    );

    expect(comp248Item).toHaveClass("status-completed");
    expect(math203Item).toHaveClass("status-unknown");
  });

  it("renders AND separator between multiple groups", () => {
    const groups = [{ anyOf: ["COMP 248"] }, { anyOf: ["MATH 203"] }];

    const { container } = render(
      <RequisiteGroup title="Prerequisites" groups={groups} courses={{}} />
    );

    const andSep = container.querySelector(".and-sep");
    expect(andSep).toBeInTheDocument();
    expect(andSep).toHaveTextContent(/and/i);
  });
});
