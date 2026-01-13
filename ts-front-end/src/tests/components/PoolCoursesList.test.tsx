import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PoolCoursesList } from "../../components/PoolCoursesList"; // ⬅️ adjust if needed
import type {
  Pool,
  CourseMap,
  CourseCode,
  SemesterId,
} from "../../types/timeline.types";

// 🔹 Make sure this path matches the real file location of DraggableCourse
vi.mock("../../components/DraggableCourse", () => {
  return {
    DraggableCourse: ({
      courseId,
      isSelected,
      onCourseSelect,
    }: {
      courseId: CourseCode;
      isSelected?: boolean;
      onCourseSelect: (id: CourseCode) => void;
    }) => (
      <div
        data-testid="draggable-course"
        data-course-id={courseId}
        data-selected={isSelected ? "true" : "false"}
        onClick={() => onCourseSelect(courseId)}>
        {courseId}
      </div>
    ),
  };
});

describe("PoolCoursesList", () => {
  const pool: Pool = {
    _id: "pool-soen-core",
    name: "Software Engineering Core",
    creditsRequired: 47.5,
    courses: ["SOEN 228", "SOEN 287", "SOEN 321"] as CourseCode[],
  };

  const courses: CourseMap = {
    "SOEN 228": {
      id: "SOEN 228" as CourseCode,
      title: "System Hardware",
      credits: 4,
      description: "Test course",
      offeredIN: [] as SemesterId[],
      prerequisites: [],
      corequisites: [],
      status: { status: "incomplete", semester: null },
    },
    "SOEN 287": {
      id: "SOEN 287" as CourseCode,
      title: "Web Programming",
      credits: 3,
      description: "Test course 2",
      offeredIN: [] as SemesterId[],
      prerequisites: [],
      corequisites: [],
      status: { status: "completed", semester: "FALL 2025" as SemesterId },
    },
    "SOEN 321": {
      id: "SOEN 321" as CourseCode,
      title: "Info Systems Security",
      credits: 3,
      description: "Test course 3",
      offeredIN: [] as SemesterId[],
      prerequisites: [],
      corequisites: [],
      status: { status: "planned", semester: "WINTER 2026" as SemesterId },
    },
  };

  it("renders all pool courses when visibleCourseIds is empty", () => {
    const onCourseSelect = vi.fn();

    render(
      <PoolCoursesList
        pool={pool}
        courses={courses}
        visibleCourseIds={[]}
        selectedCourse={null}
        onCourseSelect={onCourseSelect}
      />
    );

    const rendered = screen.getAllByTestId("draggable-course");
    expect(rendered).toHaveLength(3);

    expect(screen.getByText("SOEN 228")).toBeInTheDocument();
    expect(screen.getByText("SOEN 287")).toBeInTheDocument();
    expect(screen.getByText("SOEN 321")).toBeInTheDocument();
  });

  it("uses visibleCourseIds when there is an active filtered list", () => {
    const onCourseSelect = vi.fn();

    render(
      <PoolCoursesList
        pool={pool}
        courses={courses}
        visibleCourseIds={["SOEN 228", "SOEN 321"] as CourseCode[]}
        selectedCourse={null}
        onCourseSelect={onCourseSelect}
      />
    );

    const rendered = screen.getAllByTestId("draggable-course");
    expect(rendered).toHaveLength(2);

    expect(screen.getByText("SOEN 228")).toBeInTheDocument();
    expect(screen.getByText("SOEN 321")).toBeInTheDocument();
    expect(screen.queryByText("SOEN 287")).toBeNull();
  });

  it("marks the selected course correctly via isSelected", () => {
    const onCourseSelect = vi.fn();

    const { getAllByTestId } = render(
      <PoolCoursesList
        pool={pool}
        courses={courses}
        visibleCourseIds={[]}
        selectedCourse={"SOEN 287" as CourseCode}
        onCourseSelect={onCourseSelect}
      />
    );

    const items = getAllByTestId("draggable-course");

    const selectedItem = items.find(
      (el) => el.getAttribute("data-course-id") === "SOEN 287"
    );
    const nonSelectedItem = items.find(
      (el) => el.getAttribute("data-course-id") === "SOEN 228"
    );

    expect(selectedItem?.getAttribute("data-selected")).toBe("true");
    expect(nonSelectedItem?.getAttribute("data-selected")).toBe("false");
  });

  it("forwards onCourseSelect down to DraggableCourse", () => {
    const onCourseSelect = vi.fn();

    render(
      <PoolCoursesList
        pool={pool}
        courses={courses}
        visibleCourseIds={[]}
        selectedCourse={null}
        onCourseSelect={onCourseSelect}
      />
    );

    const items = screen.getAllByTestId("draggable-course");
    const firstItem = items[0];

    // Our mock DraggableCourse calls onCourseSelect on click
    fireEvent.click(firstItem);

    expect(onCourseSelect).toHaveBeenCalledTimes(1);
    expect(onCourseSelect).toHaveBeenCalledWith(
      firstItem.getAttribute("data-course-id")
    );
  });
});
