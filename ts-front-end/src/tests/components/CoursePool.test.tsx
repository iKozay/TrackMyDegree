import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CoursePool from "../../components/CoursePool";
import type {
  Pool,
  CourseMap,
  CourseCode,
  SemesterId,
} from "../../types/timeline.types";

// 🔹 Mock PoolCoursesList so we don't render DraggableCourse / dnd-kit here
const poolCoursesListMock = vi.fn();

vi.mock("../../components/PoolCoursesList", () => ({
  PoolCoursesList: (props: any) => {
    poolCoursesListMock(props);
    return (
      <div
        data-testid="pool-courses-list"
        data-pool-name={props.pool.name}
        data-visible-ids={(props.visibleCourseIds || []).join(",")}>
        PoolCoursesList for {props.pool.name}
      </div>
    );
  },
}));

// We use the real PoolHeader (no need to mock it)
// import { PoolHeader } from "../../components/PoolHeader"; // used indirectly

const pools: Pool[] = [
  {
    _id: "pool-ecp",
    name: "ECP_ENGR_CORE",
    creditsRequired: 0,
    courses: ["ENGR 201"] as CourseCode[],
  },
  {
    _id: "pool-engr",
    name: "Engineering Core",
    creditsRequired: 30.5,
    courses: ["ENGR 201", "ENGR 233"] as CourseCode[],
  },
  {
    _id: "pool-soen",
    name: "Software Engineering Core",
    creditsRequired: 47.5,
    courses: ["SOEN 228", "SOEN 287"] as CourseCode[],
  },
];

const courses: CourseMap = {
  "ENGR 201": {
    id: "ENGR 201" as CourseCode,
    title: "Engineering Mechanics",
    credits: 3,
    description: "",
    offeredIN: [] as SemesterId[],
    prerequisites: [],
    corequisites: [],
    status: { status: "incomplete", semester: null },
  },
  "ENGR 233": {
    id: "ENGR 233" as CourseCode,
    title: "Applied Advanced Calculus",
    credits: 3,
    description: "",
    offeredIN: [] as SemesterId[],
    prerequisites: [],
    corequisites: [],
    status: { status: "incomplete", semester: null },
  },
  "SOEN 228": {
    id: "SOEN 228" as CourseCode,
    title: "System Hardware",
    credits: 4,
    description: "",
    offeredIN: [] as SemesterId[],
    prerequisites: [],
    corequisites: [],
    status: { status: "incomplete", semester: null },
  },
  "SOEN 287": {
    id: "SOEN 287" as CourseCode,
    title: "Web Programming",
    credits: 3,
    description: "",
    offeredIN: [] as SemesterId[],
    prerequisites: [],
    corequisites: [],
    status: { status: "incomplete", semester: null },
  },
};

describe("CoursePool", () => {
  beforeEach(() => {
    poolCoursesListMock.mockClear();
  });

  it("renders heading and search input", () => {
    const onCourseSelect = vi.fn();

    render(
      <CoursePool
        pools={pools}
        courses={courses}
        onCourseSelect={onCourseSelect}
        selectedCourse={null}
      />
    );

    expect(screen.getByText("Course Pool")).toBeInTheDocument();

    const input = screen.getByPlaceholderText(
      /search courses by code or title/i
    );
    expect(input).toBeInTheDocument();
  });

  it("does not render any PoolCoursesList by default (all collapsed)", () => {
    const onCourseSelect = vi.fn();

    render(
      <CoursePool
        pools={pools}
        courses={courses}
        onCourseSelect={onCourseSelect}
        selectedCourse={null}
      />
    );

    expect(screen.queryByTestId("pool-courses-list")).toBeNull();
  });

  it("toggles a pool open/closed when clicking the header (no search)", () => {
  const onCourseSelect = vi.fn();

  const { container, queryByTestId } = render(
    <CoursePool
      pools={pools}
      courses={courses}
      onCourseSelect={onCourseSelect}
      selectedCourse={null}
    />
  );

  // Find the header button that contains the text "Engineering Core"
  const headerButtons = Array.from(
    container.querySelectorAll(".pool-section .pool-header")
  ) as HTMLButtonElement[];

  const engineeringHeader = headerButtons.find((btn) =>
    btn.textContent?.includes("Engineering Core")
  );

  expect(engineeringHeader).toBeTruthy();

  // Initially collapsed
  expect(queryByTestId("pool-courses-list")).toBeNull();

  // Click to expand Engineering Core
  fireEvent.click(engineeringHeader!);

  // Now at least one list exists and one of them is Engineering Core
  const listsAfterExpand = screen.getAllByTestId("pool-courses-list");
  const engineeringList = listsAfterExpand.find(
    (el: HTMLElement) => el.getAttribute("data-pool-name") === "Engineering Core"
  );

  expect(engineeringList).toBeTruthy();

  // Click again to collapse Engineering Core
  fireEvent.click(engineeringHeader!);

  // If another pool is still collapsed, this should be null again
  // (since only Engineering Core was expanded by click)
  expect(queryByTestId("pool-courses-list")).toBeNull();
});


  it("filters courses per pool when searching and auto-expands pools with matches", () => {
    const onCourseSelect = vi.fn();

    render(
      <CoursePool
        pools={pools}
        courses={courses}
        onCourseSelect={onCourseSelect}
        selectedCourse={null}
      />
    );

    const input = screen.getByPlaceholderText(
      /search courses by code or title/i
    );

    // search for "web", should match SOEN 287 only in "Software Engineering Core"
    fireEvent.change(input, { target: { value: "web" } });

    const lists = screen.getAllByTestId("pool-courses-list");
    // Only one pool should be expanded: Software Engineering Core
    expect(lists.length).toBe(1);
    expect(lists[0]).toHaveAttribute(
      "data-pool-name",
      "Software Engineering Core"
    );

    // visibleCourseIds joined in data-visible-ids
    expect(lists[0]).toHaveAttribute("data-visible-ids", "SOEN 287");
  });

  it("shows no expanded pools if search has no matches", () => {
    const onCourseSelect = vi.fn();

    render(
      <CoursePool
        pools={pools}
        courses={courses}
        onCourseSelect={onCourseSelect}
        selectedCourse={null}
      />
    );

    const input = screen.getByPlaceholderText(
      /search courses by code or title/i
    );

    // search for something that doesn't exist
    fireEvent.change(input, { target: { value: "nonexistent" } });

    // No pool should be expanded → no PoolCoursesList rendered
    expect(screen.queryByTestId("pool-courses-list")).toBeNull();
  });

  it("formats ECP pool names when passing pool props to children", () => {
    const onCourseSelect = vi.fn();

    render(
      <CoursePool
        pools={pools}
        courses={courses}
        onCourseSelect={onCourseSelect}
        selectedCourse={null}
      />
    );

    const input = screen.getByPlaceholderText(/search courses by code or title/i);

    // "engr" matches ENGR 201 title/code -> ECP pool has ENGR 201 so it should auto-expand
    fireEvent.change(input, { target: { value: "engr" } });

    const lists: HTMLElement[] = screen.getAllByTestId("pool-courses-list");

    const ecpList = lists.find(
    (el) => el.getAttribute("data-pool-name") === "ECP ENGR CORE"
      );

    expect(ecpList).toBeDefined();

  });

  it("hides completed and planned courses from the pool list", () => {
    const onCourseSelect = vi.fn();

    const coursesWithStatuses: CourseMap = {
      ...courses,
      "ENGR 201": {
        ...courses["ENGR 201"],
        status: { status: "completed", semester: "FALL 2025" as SemesterId },
      },
      "ENGR 233": {
        ...courses["ENGR 233"],
        status: { status: "planned", semester: "WINTER 2026" as SemesterId },
      },
    };

    render(
      <CoursePool
        pools={pools}
        courses={coursesWithStatuses}
        onCourseSelect={onCourseSelect}
        selectedCourse={null}
      />
    );

    const input = screen.getByPlaceholderText(/search courses by code or title/i);
    fireEvent.change(input, { target: { value: "engr" } });

    expect(screen.queryByTestId("pool-courses-list")).toBeNull();
  });

  
});
