// src/tests/components/DroppableSemester.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DroppableSemester } from "../../components/DroppableSemester";
import type {
  CourseMap,
  CourseCode,
  SemesterId,
} from "../../types/timeline.types";
import { useDroppable } from "@dnd-kit/core";

// 🔹 Mock dnd-kit/core the same way we mocked DraggableCourse in other tests
vi.mock("@dnd-kit/core", () => {
  const useDroppableMock = vi.fn(() => ({
    isOver: false,
    setNodeRef: vi.fn(),
  }));

  return {
    useDroppable: useDroppableMock,
  };
});

// 🔹 Mock DraggableCourse so we don't depend on real dnd behavior
vi.mock("../../components/DraggableCourse", () => {
  return {
    DraggableCourse: ({
      courseId,
      onCourseSelect,
      onRemove,
    }: {
      courseId: CourseCode;
      onCourseSelect: (id: CourseCode) => void;
      onRemove?: () => void;
    }) => (
      <div data-testid="draggable-course" data-course-id={courseId}>
        <span>{courseId}</span>
        <button
          data-testid={`select-${courseId}`}
          onClick={() => onCourseSelect(courseId)}>
          Select
        </button>
        <button data-testid={`remove-${courseId}`} onClick={() => onRemove?.()}>
          Remove
        </button>
      </div>
    ),
  };
});

describe("DroppableSemester", () => {
  const semesterId = "FALL 2025" as SemesterId;

  const courses: CourseMap = {
    "COMP 248": {
      id: "COMP 248" as CourseCode,
      title: "Object-Oriented Programming I",
      credits: 3,
      description: "OOP I",
      offeredIN: [] as SemesterId[],
      prerequisites: [],
      corequisites: [],
      status: { status: "incomplete", semester: null },
    },
    "SOEN 228": {
      id: "SOEN 228" as CourseCode,
      title: "System Hardware",
      credits: 4,
      description: "Hardware",
      offeredIN: [] as SemesterId[],
      prerequisites: [],
      corequisites: [],
      status: { status: "incomplete", semester: null },
    },
  };

  it("renders formatted semester title and total credits", () => {
    render(
      <DroppableSemester
        semesterId={semesterId}
        courses={courses}
        semesterCourses={["COMP 248", "SOEN 228"]}
        onCourseSelect={() => {}}
        selectedCourse={null}
        onRemoveCourse={() => {}}
      />
    );

    // Season label (Fall) and year
    expect(screen.getByText(/fall 2025/i)).toBeInTheDocument();

    // 3 + 4 = 7 credits
    expect(screen.getByText(/7 credits/i)).toBeInTheDocument();
  });

  it("shows empty state when there are no courses in the semester", () => {
    render(
      <DroppableSemester
        semesterId={semesterId}
        courses={courses}
        semesterCourses={[]}
        onCourseSelect={() => {}}
        selectedCourse={null}
        onRemoveCourse={() => {}}
      />
    );

    expect(screen.getByText(/drop courses here/i)).toBeInTheDocument();
    expect(screen.queryByTestId("draggable-course")).toBeNull();
  });

  it("renders a DraggableCourse for each course in semesterCourses", () => {
    render(
      <DroppableSemester
        semesterId={semesterId}
        courses={courses}
        semesterCourses={["COMP 248", "SOEN 228"]}
        onCourseSelect={() => {}}
        selectedCourse={null}
        onRemoveCourse={() => {}}
      />
    );

    const draggableCourses = screen.getAllByTestId("draggable-course");
    expect(draggableCourses).toHaveLength(2);

    expect(screen.getByText("COMP 248")).toBeInTheDocument();
    expect(screen.getByText("SOEN 228")).toBeInTheDocument();
  });

  it("calls onCourseSelect when a course is selected", () => {
    const onCourseSelect = vi.fn();

    render(
      <DroppableSemester
        semesterId={semesterId}
        courses={courses}
        semesterCourses={["COMP 248"]}
        onCourseSelect={onCourseSelect}
        selectedCourse={null}
        onRemoveCourse={() => {}}
      />
    );

    const selectBtn = screen.getByTestId("select-COMP 248");
    fireEvent.click(selectBtn);

    expect(onCourseSelect).toHaveBeenCalledTimes(1);
    expect(onCourseSelect).toHaveBeenCalledWith("COMP 248");
  });

  it("calls onRemoveCourse with correct args when remove is triggered", () => {
    const onRemoveCourse = vi.fn();

    render(
      <DroppableSemester
        semesterId={semesterId}
        courses={courses}
        semesterCourses={["COMP 248"]}
        onCourseSelect={() => {}}
        selectedCourse={null}
        onRemoveCourse={onRemoveCourse}
      />
    );

    const removeBtn = screen.getByTestId("remove-COMP 248");
    fireEvent.click(removeBtn);

    expect(onRemoveCourse).toHaveBeenCalledTimes(1);
    expect(onRemoveCourse).toHaveBeenCalledWith("COMP 248", semesterId);
  });

  it("adds drag-over class when useDroppable reports isOver = true", () => {
    const useDroppableMock = useDroppable as unknown as ReturnType<
      typeof vi.fn
    >;

    useDroppableMock.mockReturnValueOnce({
      isOver: true,
      setNodeRef: vi.fn(),
    });

    const { container } = render(
      <DroppableSemester
        semesterId={semesterId}
        courses={courses}
        semesterCourses={[]}
        onCourseSelect={() => {}}
        selectedCourse={null}
        onRemoveCourse={() => {}}
      />
    );

    const semesterDiv = container.querySelector(".semester");
    expect(semesterDiv).toHaveClass("drag-over");
  });
});
