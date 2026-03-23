import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { HTMLAttributes, ReactNode } from "react";
import CoursePage, { type CourseGroup } from "../../pages/CoursePage";
import type { CourseData } from "@trackmydegree/shared";
import useDegrees from "../../legacy/hooks/useDegree.jsx";
import useCourses from "../../legacy/hooks/useCourses.jsx";
import useResponsive from "../../legacy/hooks/useResponsive.jsx";

vi.mock("../../legacy/hooks/useDegree.jsx", () => ({
  default: vi.fn(),
}));

vi.mock("../../legacy/hooks/useCourses.jsx", () => ({
  default: vi.fn(),
}));

vi.mock("../../legacy/hooks/useResponsive.jsx", () => ({
  default: vi.fn(),
}));

vi.mock("../../legacy/components/SectionModal.jsx", () => ({
  default: () => <button>Show Course Schedule</button>,
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => {
      const strippedProps = Object.fromEntries(
        Object.entries(props).filter(
          ([key]) => !["whileHover", "whileTap", "layout", "initial", "animate", "exit", "transition"].includes(key)
        )
      ) as HTMLAttributes<HTMLDivElement>;

      return <div {...strippedProps}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const mockUseDegrees = vi.mocked(useDegrees);
const mockUseCourses = vi.mocked(useCourses);
const mockUseResponsive = vi.mocked(useResponsive);

const fetchCoursesByDegree = vi.fn();
const fetchAllCourses = vi.fn();

const defaultDegrees = [
  { _id: "deg-1", name: "Software Engineering" },
  { _id: "deg-2", name: "Computer Science" },
];

const defaultCourseList: CourseGroup[] = [
  {
    name: "Core",
    courses: [
      {
        _id: "SOEN490",
        title: "Capstone Project",
        credits: 4,
        description: "Final year capstone project.",
        components: ["Lecture"],
        notes: "Department approval may be required.",
        prereqCoreqText: "SOEN 287 or COMP 348",
      },
      {
        _id: "SOEN341",
        title: "Software Process",
        credits: 3,
        description: "Intro to software process.",
        prereqCoreqText: "",
      },
    ],
  },
];

const subcourseList: CourseGroup[] = [
  {
    name: "Electives",
    courses: [{ _id: "SOEN287", title: "Web Programming", credits: 3 }],
    subcourseTitle: "Choose One",
    subcourseCredits: 3,
    subcourses: [
      {
        name: "",
        courses: [{ _id: "SOEN321", title: "Intro to Systems Security", credits: 3 }],
      },
    ],
  },
];

function renderPage(options?: {
  isDesktop?: boolean;
  loading?: boolean;
  degrees?: Array<{ _id: string; name: string }>;
  courseList?: CourseGroup[];
}) {
  const {
    isDesktop = true,
    loading = false,
    degrees = defaultDegrees,
    courseList = defaultCourseList,
  } = options || {};

  mockUseDegrees.mockReturnValue({
    degrees,
    loading: false,
    error: null,
  } as unknown as ReturnType<typeof useDegrees>);
  mockUseCourses.mockReturnValue({
    courseList,
    loading,
    error: null,
    fetchCoursesByDegree,
    fetchAllCourses,
  } as unknown as ReturnType<typeof useCourses>);
  mockUseResponsive.mockReturnValue({
    isDesktop,
    isMobile: !isDesktop,
  } as unknown as ReturnType<typeof useResponsive>);

  return render(<CoursePage />);
}

describe("CoursePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders initial empty state before a degree is selected", () => {
    renderPage();

    expect(screen.getByText("Explore Courses")).toBeInTheDocument();
    expect(screen.getByText("Select a Degree")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /select degree/i })).toBeInTheDocument();
  });

  it("selects a degree and keeps all pools collapsed by default", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /select degree/i }));
    fireEvent.click(screen.getByText("Software Engineering"));

    expect(fetchCoursesByDegree).toHaveBeenCalledWith("deg-1");
    expect(screen.getByPlaceholderText(/search courses/i)).toBeInTheDocument();
    expect(screen.getByText("Core")).toBeInTheDocument();

    expect(screen.queryByText("SOEN 490")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /core/i }));
    expect(screen.getByText("SOEN 490")).toBeInTheDocument();
  });

  it("supports selecting All Courses from dropdown", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /select degree/i }));
    fireEvent.click(screen.getByText("All Courses"));

    expect(fetchAllCourses).toHaveBeenCalledTimes(1);
  });

  it("renders loading state while course data is being fetched", () => {
    renderPage({ loading: true });
    expect(screen.getByText("Loading courses...")).toBeInTheDocument();
  });

  it("filters by search term and shows no results state", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /select degree/i }));
    fireEvent.click(screen.getByText("Software Engineering"));

    const searchInput = screen.getByPlaceholderText(/search courses/i);
    fireEvent.change(searchInput, { target: { value: "COMP999" } });

    expect(screen.getByText("No Courses Found")).toBeInTheDocument();
  });

  it("shows empty no-results state without search term when selected degree has no courses", () => {
    renderPage({ courseList: [] });

    fireEvent.click(screen.getByRole("button", { name: /select degree/i }));
    fireEvent.click(screen.getByText("Software Engineering"));

    expect(screen.getByText("No Courses Found")).toBeInTheDocument();
    expect(
      screen.getByText("No courses available for this selection.")
    ).toBeInTheDocument();
  });

  it("shows course details panel on desktop after selecting a course", () => {
    renderPage({ isDesktop: true });

    fireEvent.click(screen.getByRole("button", { name: /select degree/i }));
    fireEvent.click(screen.getByText("Software Engineering"));
    fireEvent.click(screen.getByRole("button", { name: /core/i }));
    fireEvent.click(screen.getByText("SOEN 490"));

    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Final year capstone project.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /show course schedule/i })).toBeInTheDocument();
    expect(screen.getByText("Prerequisites & Corequisites")).toBeInTheDocument();
  });

  it("renders fallback requisites message when course has no requisites", () => {
    renderPage({ isDesktop: true });

    fireEvent.click(screen.getByRole("button", { name: /select degree/i }));
    fireEvent.click(screen.getByText("Software Engineering"));
    fireEvent.click(screen.getByRole("button", { name: /core/i }));
    fireEvent.click(screen.getByText("SOEN 341"));

    expect(
      screen.getByText("No prerequisites or corequisites required")
    ).toBeInTheDocument();
  });

  it("renders nested subcourse groups when available", () => {
    renderPage({ courseList: subcourseList });

    fireEvent.click(screen.getByRole("button", { name: /select degree/i }));
    fireEvent.click(screen.getByText("Software Engineering"));
    const electiveHeader = screen.getByText("Electives").closest("button");
    expect(electiveHeader).toBeTruthy();
    if (electiveHeader) {
      fireEvent.click(electiveHeader);
    }

    expect(screen.getByText(/Choose One/i)).toBeInTheDocument();

    const subgroupButton = screen.getAllByRole("button", { name: /1 courses/i })[1];
    fireEvent.click(subgroupButton);
    expect(screen.getByText("SOEN 321")).toBeInTheDocument();
  });

  it("opens and closes the mobile course modal when selecting a course", () => {
    const { container } = renderPage({ isDesktop: false });

    fireEvent.click(screen.getByRole("button", { name: /select degree/i }));
    fireEvent.click(screen.getByText("Software Engineering"));
    fireEvent.click(screen.getByRole("button", { name: /core/i }));
    fireEvent.click(screen.getByText("SOEN 490"));

    expect(container.querySelector(".course-modal-overlay")).toBeInTheDocument();

    const closeButton = container.querySelector(".modal-close-btn");
    expect(closeButton).toBeTruthy();
    if (closeButton) {
      fireEvent.click(closeButton);
    }

    expect(container.querySelector(".course-modal-overlay")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Show-more pagination
// ---------------------------------------------------------------------------

function makeLargeCourseList(count: number): CourseGroup[] {
  const courses: CourseData[] = Array.from({ length: count }, (_, i) => ({
    _id: `COMP${String(i).padStart(3, "0")}`,
    title: `Course ${i}`,
    credits: 3,
  }));
  return [{ name: "Large Pool", courses }];
}

describe("CoursePage – show-more pagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function openPool(courseList: CourseGroup[]) {
    renderPage({ courseList });
    fireEvent.click(screen.getByRole("button", { name: /select degree/i }));
    fireEvent.click(screen.getByText("Software Engineering"));
    fireEvent.click(screen.getByRole("button", { name: /large pool/i }));
  }

  it("does not show the button when the pool has 100 or fewer courses", () => {
    openPool(makeLargeCourseList(100));
    expect(
      screen.queryByRole("button", { name: /show.*more courses/i })
    ).not.toBeInTheDocument();
  });

  it("caps the initial render at 100 and shows the button for a 101-course pool", () => {
    const { container } = renderPage({ courseList: makeLargeCourseList(101) });
    fireEvent.click(screen.getByRole("button", { name: /select degree/i }));
    fireEvent.click(screen.getByText("Software Engineering"));
    fireEvent.click(screen.getByRole("button", { name: /large pool/i }));

    expect(container.querySelectorAll(".course-card-item")).toHaveLength(100);
    expect(
      screen.getByRole("button", { name: /show 1 more courses/i })
    ).toBeInTheDocument();
    expect(screen.getByText("(1 remaining)")).toBeInTheDocument();
  });

  it("reveals all courses after one click and hides the button when nothing remains", () => {
    const { container } = renderPage({ courseList: makeLargeCourseList(101) });
    fireEvent.click(screen.getByRole("button", { name: /select degree/i }));
    fireEvent.click(screen.getByText("Software Engineering"));
    fireEvent.click(screen.getByRole("button", { name: /large pool/i }));

    fireEvent.click(
      screen.getByRole("button", { name: /show 1 more courses/i })
    );

    expect(container.querySelectorAll(".course-card-item")).toHaveLength(101);
    expect(
      screen.queryByRole("button", { name: /show.*more courses/i })
    ).not.toBeInTheDocument();
  });

  it("pages through in increments of 100 for a 250-course pool", () => {
    const { container } = renderPage({ courseList: makeLargeCourseList(250) });
    fireEvent.click(screen.getByRole("button", { name: /select degree/i }));
    fireEvent.click(screen.getByText("Software Engineering"));
    fireEvent.click(screen.getByRole("button", { name: /large pool/i }));

    // Initial: 100 visible, 150 hidden
    expect(container.querySelectorAll(".course-card-item")).toHaveLength(100);
    expect(screen.getByText("(150 remaining)")).toBeInTheDocument();

    // First click: 200 visible, 50 hidden
    fireEvent.click(
      screen.getByRole("button", { name: /show 100 more courses/i })
    );
    expect(container.querySelectorAll(".course-card-item")).toHaveLength(200);
    expect(screen.getByText("(50 remaining)")).toBeInTheDocument();

    // Second click: all 250 visible, button gone
    fireEvent.click(
      screen.getByRole("button", { name: /show 50 more courses/i })
    );
    expect(container.querySelectorAll(".course-card-item")).toHaveLength(250);
    expect(
      screen.queryByRole("button", { name: /show.*more courses/i })
    ).not.toBeInTheDocument();
  });
});
