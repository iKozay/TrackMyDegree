import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TimeLinePage from "../../pages/TimelinePage";
import * as useAuthHook from "../../hooks/useAuth";
import * as useTimelineStateHook from "../../hooks/useTimelineState";
import * as timelineUtils from "../../utils/timelineUtils";

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

vi.mock("../../components/MainModal", () => ({
  MainModal: ({ onSave }: { onSave?: (name: string) => void }) => {
    onSave?.("Saved Timeline");
    return <div data-testid="main-modal" />;
  },
}));
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ jobId: "test-job-id" }),
    useLocation: () => ({ pathname: "/timeline/test-job-id" }),
    useNavigate: () => vi.fn(),
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
    vi.clearAllMocks();
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

    expect(screen.getByTestId("main-modal")).toBeInTheDocument();
    expect(timelineUtils.saveTimeline).toHaveBeenCalledWith(
      "test-user-id",
      "Saved Timeline",
      "test-job-id"
    );
  });
});
