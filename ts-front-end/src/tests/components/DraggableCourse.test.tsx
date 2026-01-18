import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DraggableCourse } from "../../components/DraggableCourse";
import type {
  Course,
  CourseCode,
  CourseStatusValue,
  SemesterId,
} from "../../types/timeline.types";
import { useDraggable } from "@dnd-kit/core";

// 🔹 Mock dnd-kit useDraggable
vi.mock("@dnd-kit/core", () => {
  const useDraggableMock = vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false,
  }));

  return {
    useDraggable: useDraggableMock,
  };
});

const baseCourse = (status: CourseStatusValue): Course => ({
  id: "COMP 248" as CourseCode,
  title: "Object-Oriented Programming I",
  credits: 3,
  description: "Intro OOP",
  offeredIN: [] as SemesterId[],
  prerequisites: [],
  corequisites: [],
  status: {
    status,
    semester: null,
  },
});

describe("DraggableCourse", () => {
  const courseId = "COMP 248" as CourseCode;

  beforeEach(() => {
    // reset mock between tests
    (useDraggable as any).mockReset();
    (useDraggable as any).mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      isDragging: false,
    });
  });

  it("renders course code, title and credits", () => {
    const course = baseCourse("incomplete");

    render(
      <DraggableCourse
        courseId={courseId}
        course={course}
        isSelected={false}
        onCourseSelect={() => {}}
      />,
    );

    expect(screen.getByText("COMP 248")).toBeInTheDocument();
    expect(
      screen.getByText("Object-Oriented Programming I"),
    ).toBeInTheDocument();
    expect(screen.getByText(/3 cr/i)).toBeInTheDocument();
  });

  it("applies correct status class based on course status", () => {
    const course = baseCourse("completed");

    const { container, rerender } = render(
      <DraggableCourse
        courseId={courseId}
        course={course}
        isSelected={false}
        onCourseSelect={() => {}}
      />,
    );

    const card = container.querySelector(".course-card")!;
    expect(card).toHaveClass("status-completed");
    expect(card).toHaveClass("not-draggable");

    // Test planned
    rerender(
      <DraggableCourse
        courseId={courseId}
        course={baseCourse("planned")}
        isSelected={false}
        onCourseSelect={() => {}}
      />,
    );
    expect(card).toHaveClass("status-planned");

    // Test in-progress
    rerender(
      <DraggableCourse
        courseId={courseId}
        course={baseCourse("planned")}
        isSelected={false}
        onCourseSelect={() => {}}
      />,
    );
    expect(card).toHaveClass("status-planned");

    // Test incomplete
    rerender(
      <DraggableCourse
        courseId={courseId}
        course={baseCourse("incomplete")}
        isSelected={false}
        onCourseSelect={() => {}}
      />,
    );
    expect(card).toHaveClass("status-incomplete");
  });

  it("adds selected class when isSelected = true", () => {
    const course = baseCourse("incomplete");

    const { container, rerender } = render(
      <DraggableCourse
        courseId={courseId}
        course={course}
        isSelected={false}
        onCourseSelect={() => {}}
      />,
    );

    const card = container.querySelector(".course-card")!;
    expect(card).not.toHaveClass("selected");

    rerender(
      <DraggableCourse
        courseId={courseId}
        course={course}
        isSelected={true}
        onCourseSelect={() => {}}
      />,
    );

    expect(card).toHaveClass("selected");
  });

  it("calls onCourseSelect when clicked and not dragging", () => {
    const course = baseCourse("incomplete");
    const onCourseSelect = vi.fn();

    render(
      <DraggableCourse
        courseId={courseId}
        course={course}
        isSelected={false}
        onCourseSelect={onCourseSelect}
      />,
    );

    const content = screen.getByText("COMP 248").closest(".course-content")!;
    fireEvent.click(content);

    expect(onCourseSelect).toHaveBeenCalledTimes(1);
    expect(onCourseSelect).toHaveBeenCalledWith(courseId);
  });

  it("does not call onCourseSelect when isDragging is true", () => {
    const course = baseCourse("incomplete");
    const onCourseSelect = vi.fn();

    // override mock once for this test
    (useDraggable as any).mockReturnValueOnce({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      isDragging: true,
    });

    render(
      <DraggableCourse
        courseId={courseId}
        course={course}
        isSelected={false}
        onCourseSelect={onCourseSelect}
      />,
    );

    const content = screen.getByText("COMP 248").closest(".course-content")!;
    fireEvent.click(content);

    expect(onCourseSelect).not.toHaveBeenCalled();
  });

  it("uses different drag id depending on whether semesterId is provided", () => {
    const course = baseCourse("incomplete");

    // First render: from pool
    render(
      <DraggableCourse
        courseId={courseId}
        course={course}
        isSelected={false}
        onCourseSelect={() => {}}
      />,
    );

    expect(useDraggable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: `pool:${courseId}`,
        data: expect.objectContaining({
          source: "pool",
          courseId,
          semesterId: undefined,
        }),
      }),
    );

    (useDraggable as any).mockClear();

    // Second render: from planner with semesterId
    render(
      <DraggableCourse
        courseId={courseId}
        course={course}
        isSelected={false}
        onCourseSelect={() => {}}
        semesterId={"FALL 2025" as SemesterId}
      />,
    );

    expect(useDraggable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: `planner:FALL 2025:${courseId}`,
        data: expect.objectContaining({
          source: "planner",
          courseId,
          semesterId: "FALL 2025",
        }),
      }),
    );
  });
});
