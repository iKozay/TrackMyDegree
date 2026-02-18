import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MainModal } from "../../components/MainModal";
import type { Pool, CourseMap } from "../../types/timeline.types";

vi.mock("../../components/BaseModal", () => ({
  BaseModal: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="base-modal">{children}</div> : null,
}));

vi.mock("../../components/InsightsModal", () => ({
  InsightsModal: ({ onClose }: { onClose: () => void }) => (
    <>
      <div data-testid="insights-modal">Insights Modal</div>
      <button data-testid="insights-close-btn" onClick={onClose}>Close Insights</button>
    </>
  ),
}));

vi.mock("../../components/AddModal", () => ({
  AddModal: ({ type }: { type: string }) => (
    <div data-testid="add-modal">Add Modal - {type}</div>
  ),
}));

vi.mock("../../components/SaveTimelineModal", () => ({
  SaveTimelineModal: ({ onClose }: { onClose: () => void }) => (
    <>
      <div data-testid="save-timeline-modal">Save Timeline Modal</div>
      <button data-testid="save-close-btn" onClick={onClose}>Close Save Timeline</button>
    </>
  ),
}));

vi.mock("../../components/CoopValidationModal", () => ({
  CoopValidationModal: () => <div data-testid="coop-validation-modal">Co-op Validation</div>,
}));

describe("MainModal", () => {
  const mockOnSave = vi.fn();
  const mockOnAdd = vi.fn();
  const mockOnClose = vi.fn();

  const mockPools: Pool[] = [
    {
      _id: "pool-cs-core",
      name: "Computer Science Core",
      courses: ["COMP 248", "COMP 249"],
      creditsRequired: 30,
    },
  ];

  const mockCourses: CourseMap = {
    "COMP 248": {
      id: "COMP 248",
      title: "OOP I",
      description: "Test",
      credits: 3,
      offeredIN: [],
      prerequisites: [],
      corequisites: [],
      status: { status: "completed", semester: null },
    },
  };

  const defaultProps = {
    open: true,
    type: "insights",
    pools: mockPools,
    courses: mockCourses,
    timelineName: "My Timeline",
    onSave: mockOnSave,
    onAdd: mockOnAdd,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not render when open is false", () => {
    render(<MainModal {...defaultProps} open={false} />);

    expect(screen.queryByTestId("base-modal")).not.toBeInTheDocument();
  });

  it("should render BaseModal when open is true", () => {
    render(<MainModal {...defaultProps} />);

    expect(screen.getByTestId("base-modal")).toBeInTheDocument();
  });

  it("should render InsightsModal when type is insights", () => {
    render(<MainModal {...defaultProps} type="insights" />);

    expect(screen.getByTestId("insights-modal")).toBeInTheDocument();
    expect(screen.getByText("Insights Modal")).toBeInTheDocument();
  });

  it("should call onClose when InsightsModal's onClose is triggered", () => {
    render(<MainModal {...defaultProps} type="insights" />);

    const closeBtn = screen.getByTestId("insights-close-btn");
    closeBtn.click();

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("should render AddModal with exemption type when type is exemption", () => {
    render(<MainModal {...defaultProps} type="exemption" />);

    expect(screen.getByTestId("add-modal")).toBeInTheDocument();
    expect(screen.getByText("Add Modal - exemption")).toBeInTheDocument();
  });

  it("should render AddModal with deficiency type when type is deficiency", () => {
    render(<MainModal {...defaultProps} type="deficiency" />);

    expect(screen.getByTestId("add-modal")).toBeInTheDocument();
    expect(screen.getByText("Add Modal - deficiency")).toBeInTheDocument();
  });

  it("should render SaveTimelineModal when type is save", () => {
    render(<MainModal {...defaultProps} type="save" />);

    expect(screen.getByTestId("save-timeline-modal")).toBeInTheDocument();
    expect(screen.getByText("Save Timeline Modal")).toBeInTheDocument();
  });

  it("should call onClose when SaveTimelineModal's onClose is triggered", () => {
    render(<MainModal {...defaultProps} type="save" />);

    const closeBtn = screen.getByTestId("save-close-btn");
    closeBtn.click();

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("should render CoopValidationModal when type is coopValidation", () => {
    render(<MainModal {...defaultProps} type="coop" />);

    expect(screen.getByTestId("coop-validation-modal")).toBeInTheDocument();
    expect(screen.getByText("Co-op Validation")).toBeInTheDocument();
  });

  it("should render unknown modal message for unrecognized type", () => {
    render(<MainModal {...defaultProps} type="unknown" />);

    expect(screen.getByText("Unknown modal")).toBeInTheDocument();
  });

  it("should pass correct props to child modals", () => {
    const { rerender } = render(<MainModal {...defaultProps} type="insights" />);
    expect(screen.getByTestId("insights-modal")).toBeInTheDocument();

    rerender(<MainModal {...defaultProps} type="exemption" />);
    expect(screen.getByText("Add Modal - exemption")).toBeInTheDocument();

    rerender(<MainModal {...defaultProps} type="deficiency" />);
    expect(screen.getByText("Add Modal - deficiency")).toBeInTheDocument();

    rerender(<MainModal {...defaultProps} type="save" />);
    expect(screen.getByTestId("save-timeline-modal")).toBeInTheDocument();

    rerender(<MainModal {...defaultProps} type="coop" />);
    expect(screen.getByText("Co-op Validation")).toBeInTheDocument();
  });

});
