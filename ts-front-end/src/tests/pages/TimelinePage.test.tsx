import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TimeLinePage from "../../pages/TimelinePage";
import * as useAuthHook from "../../hooks/useAuth";
import * as useTimelineStateHook from "../../hooks/useTimelineState";
import * as timelineUtils from "../../utils/timelineUtils";

import { TimelineHeader } from "../../components/TimelineHeader";
import { MainModal } from "../../components/MainModal";
import CoursePool from "../../components/CoursePool";
import SemesterPlanner from "../../components/SemesterPlanner";
import CourseDetails from "../../components/CourseDetail";

// Mock the hooks
vi.mock("../../hooks/useAuth");
vi.mock("../../hooks/useTimelineState");
vi.mock("../../utils/timelineUtils", async () => {
  const actual = await vi.importActual<
    typeof import("../../utils/timelineUtils")
  >("../../utils/timelineUtils");
  return {
    ...actual,
    saveTimeline: vi.fn(),
    calculateEarnedCredits: vi.fn(() => 0),
  };
});

vi.mock("../../components/TimelineHeader", () => ({
  TimelineHeader: vi.fn(() => <div data-testid="timeline-header" />),
}));

vi.mock("../../components/MainModal", () => ({
  MainModal: vi.fn(() => {
    return <div data-testid="main-modal" />;
  }),
}));

vi.mock("../../components/CoursePool", () => ({
  default: vi.fn(() => <div data-testid="course-pool" />),
}));

vi.mock("../../components/SemesterPlanner", () => ({
  default: vi.fn(() => <div data-testid="semester-planner" />),
}));

vi.mock("../../components/CourseDetail", () => ({
  default: vi.fn(() => <div data-testid="course-detail" />),
}));
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ jobId: "test-job-id" }),
    useLocation: () => ({ pathname: "/timeline/test-job-id" }),
    useNavigate: () => mockNavigate,
  };
});

const mockUseAuth = vi.spyOn(useAuthHook, "useAuth");
const mockUseTimelineState = vi.spyOn(useTimelineStateHook, "useTimelineState");

const mockTimelineState = {
  status: "done" as const,
  state: {
    courses: {},
    pools: [],
    semesters: [],
    selectedCourse: null,
    degree: { name: "Test Degree", totalCredits: 120, coursePools: [] },
    modal: { open: false, type: "" },
    timelineName: "Test Timeline",
    history: [],
    future: [],
  },
  actions: {
    initTimelineState: vi.fn(),
    moveFromPoolToSemester: vi.fn(),
    moveBetweenSemesters: vi.fn(),
    addCourse: vi.fn(),
    removeFromSemester: vi.fn(),
    changeCourseStatus: vi.fn(),
    selectCourse: vi.fn(),
    addSemester: vi.fn(),
    openModal: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
  },
  canUndo: false,
  canRedo: false,
  errorMessage: null,
};

const mockAuthState = {
  user: { id: "test-user-id", name: "Test User", email: "test@example.com", role: "user" },
  isAuthenticated: true,
  loading: false,
  login: vi.fn(),
  signup: vi.fn(),
  logout: vi.fn(),
};

const renderPage = () => {
  render(
    <BrowserRouter>
      <TimeLinePage />
    </BrowserRouter>
  );
};

describe("TimeLinePage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUseAuth.mockReturnValue(mockAuthState);
  });

  it("renders TimelineLoader when status is processing", () => {
    mockUseTimelineState.mockReturnValue({
      ...mockTimelineState,
      status: "processing",
    });

    renderPage();

    expect(screen.getByText(/preparing your academic plan/i)).toBeInTheDocument();
  });

  it("renders TimelineError when status is error", () => {
    mockUseTimelineState.mockReturnValue({
      ...mockTimelineState,
      status: "error",
      errorMessage: "Timeline generation expired. Please try again.",
    });

    renderPage();

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(
      screen.getByText(/timeline generation expired/i)
    ).toBeInTheDocument();

    const retryButton = screen.getByRole("button", { name: /try again/i });
    retryButton.click();
    expect(mockNavigate).toHaveBeenCalledWith("/timeline");
  });

  it("renders the main timeline interface when status is success", () => {
    mockUseTimelineState.mockReturnValue(mockTimelineState);

    renderPage();

    // Check if main sections are present
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("renders authenticated state correctly", () => {
    mockUseTimelineState.mockReturnValue(mockTimelineState);
    mockUseAuth.mockReturnValue({
      ...mockAuthState,
      isAuthenticated: true,
    });

    renderPage();

    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("calls saveTimeline from modal save when authenticated", () => {
    mockUseTimelineState.mockReturnValue({
      ...mockTimelineState,
      state: {
        ...mockTimelineState.state,
        modal: { open: true, type: "save" },
      },
    });

    renderPage();

    const { onSave } = (vi.mocked(MainModal) as any).mock.calls[0][0];
    onSave("Saved Timeline");

    expect(timelineUtils.saveTimeline).toHaveBeenCalledWith(
      "test-user-id",
      "Saved Timeline",
      "test-job-id"
    );
  });

  it("calls actions when modal add and close are triggered", () => {
    mockUseTimelineState.mockReturnValue({
      ...mockTimelineState,
      state: {
        ...mockTimelineState.state,
        modal: { open: true, type: "add" },
      },
    });

    renderPage();

    const { onAdd, onClose } = (vi.mocked(MainModal) as any).mock.calls[0][0];

    onAdd("course-1", "elective");
    expect(mockTimelineState.actions.addCourse).toHaveBeenCalledWith("course-1", "elective");

    onClose(false);
    expect(mockTimelineState.actions.openModal).toHaveBeenCalledWith(false);
  });

  it("calls header actions correctly", () => {
    mockUseTimelineState.mockReturnValue(mockTimelineState);
    renderPage();

    const { onUndo, onRedo } = (vi.mocked(TimelineHeader) as any).mock.calls[0][0];

    onUndo();
    expect(mockTimelineState.actions.undo).toHaveBeenCalled();

    onRedo();
    expect(mockTimelineState.actions.redo).toHaveBeenCalled();
  });

  it("calls pool and planner actions correctly", () => {
    mockUseTimelineState.mockReturnValue(mockTimelineState);
    renderPage();

    const { onCourseSelect } = (vi.mocked(CoursePool) as any).mock.calls[0][0];
    onCourseSelect("course-1");
    expect(mockTimelineState.actions.selectCourse).toHaveBeenCalledWith("course-1");

    const { onAddSemester } = (vi.mocked(SemesterPlanner) as any).mock.calls[0][0];
    onAddSemester();
    expect(mockTimelineState.actions.addSemester).toHaveBeenCalled();
  });

  it("calls detail actions correctly", () => {
    mockUseTimelineState.mockReturnValue({
      ...mockTimelineState,
      state: {
        ...mockTimelineState.state,
        selectedCourse: "course-1",
        courses: { "course-1": { id: "course-1", title: "Test Course" } } as any
      }
    });
    renderPage();

    const { onRemoveCourse, onChangeCourseStatus } = (vi.mocked(CourseDetails) as any).mock.calls[0][0];

    onRemoveCourse("course-1");
    expect(mockTimelineState.actions.removeFromSemester).toHaveBeenCalledWith("course-1");

    onChangeCourseStatus("course-1", "completed");
    expect(mockTimelineState.actions.changeCourseStatus).toHaveBeenCalledWith("course-1", "completed");
  });

  it("does not call saveTimeline from modal save when unauthenticated", () => {
    mockUseAuth.mockReturnValue({
      ...mockAuthState,
      user: null,
      isAuthenticated: false,
    });
    mockUseTimelineState.mockReturnValue({
      ...mockTimelineState,
      state: {
        ...mockTimelineState.state,
        modal: { open: true, type: "insights" },
      },
    });

    renderPage();

    const { onSave } = (vi.mocked(MainModal) as any).mock.calls[0][0];
    onSave("Some Name");

    expect(timelineUtils.saveTimeline).not.toHaveBeenCalled();
  });

  it("redirects to signin when trying to save while unauthenticated", () => {
    vi.stubGlobal('location', { pathname: '/timeline/test-job-id' });
    mockUseAuth.mockReturnValue({
      ...mockAuthState,
      user: null,
      isAuthenticated: false,
    });
    mockUseTimelineState.mockReturnValue(mockTimelineState);

    renderPage();

    // The handler is passed to TimelineHeader
    const { onOpenModal } = (vi.mocked(TimelineHeader) as any).mock.calls[0][0];
    onOpenModal(true, "save");

    expect(mockNavigate).toHaveBeenCalledWith("/signin?redirectTo=%2Ftimeline%2Ftest-job-id");
    vi.unstubAllGlobals();
  });

  it("opens modal when authenticated and type is save", () => {
    mockUseTimelineState.mockReturnValue(mockTimelineState);
    renderPage();

    const { onOpenModal } = (vi.mocked(TimelineHeader) as any).mock.calls[0][0];
    onOpenModal(true, "save");

    expect(mockTimelineState.actions.openModal).toHaveBeenCalledWith(true, "save");
  });

  it("uses fallback pools when they are not found in state", () => {
    mockUseTimelineState.mockReturnValue({
      ...mockTimelineState,
      state: {
        ...mockTimelineState.state,
        pools: [],
      }
    });

    renderPage();
    // This hits the fallback logic (line 44 and 47)
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("renders with exemption and deficiency pools found", () => {
    mockUseTimelineState.mockReturnValue({
      ...mockTimelineState,
      state: {
        ...mockTimelineState.state,
        pools: [
          { _id: "exemption-id", name: "ExemPtion", creditsRequired: 0, courses: [] },
          { _id: "deficiency-id", name: "DefiCiency", creditsRequired: 3, courses: [] },
        ],
      }
    });

    renderPage();
    expect(screen.getByRole("main")).toBeInTheDocument();
  });
});
