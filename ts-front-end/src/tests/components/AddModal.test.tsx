import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AddModal } from "../../components/AddModal";

describe("AddModal (content)", () => {
  const mockOnAdd = vi.fn();

  const defaultProps = {
    type: "exemption" as const,
    courses: {
      "COMP 248": {} as any,
      "COMP 249": {} as any,
      "SOEN 228": {} as any,
      "MATH 203": {} as any,
    },
    onAdd: mockOnAdd,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders header text for the given type", () => {
    render(<AddModal {...defaultProps} />);
    expect(screen.getByText(/exemption - Add Course/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Select a course to add to your exemptions/i),
    ).toBeInTheDocument();
  });

  it("displays courses from props", async () => {
    render(<AddModal {...defaultProps} />);

    expect(await screen.findByText("COMP 248")).toBeInTheDocument();
    expect(screen.getByText("COMP 249")).toBeInTheDocument();
    expect(screen.getByText("SOEN 228")).toBeInTheDocument();
    expect(screen.getByText("MATH 203")).toBeInTheDocument();
  });

  it("filters courses based on search term", async () => {
    render(<AddModal {...defaultProps} />);

    // wait for initial list
    expect(await screen.findByText("COMP 248")).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(
      /Search courses by code or title\.\.\./i,
    );

    fireEvent.change(searchInput, { target: { value: "COMP" } });

    await waitFor(() => {
      expect(screen.getByText("COMP 248")).toBeInTheDocument();
      expect(screen.getByText("COMP 249")).toBeInTheDocument();
      expect(screen.queryByText("SOEN 228")).not.toBeInTheDocument();
      expect(screen.queryByText("MATH 203")).not.toBeInTheDocument();
    });
  });

  it("performs case-insensitive filtering", async () => {
    render(<AddModal {...defaultProps} />);

    expect(await screen.findByText("COMP 248")).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(
      /Search courses by code or title\.\.\./i,
    );

    fireEvent.change(searchInput, { target: { value: "comp" } });

    await waitFor(() => {
      expect(screen.getByText("COMP 248")).toBeInTheDocument();
      expect(screen.getByText("COMP 249")).toBeInTheDocument();
    });
  });

  it("shows 'no results' message when search has no matches", async () => {
    render(<AddModal {...defaultProps} />);

    expect(await screen.findByText("COMP 248")).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(
      /Search courses by code or title\.\.\./i,
    );

    fireEvent.change(searchInput, { target: { value: "XXXX" } });

    expect(
      await screen.findByText(/No courses found matching your search\./i),
    ).toBeInTheDocument();
  });

  it("shows 'no courses available' when no courses are passed", async () => {
    render(<AddModal {...defaultProps} courses={{}} />);

    expect(
      await screen.findByText(/No courses available\./i),
    ).toBeInTheDocument();
  });

  it("resets filtered courses when search is cleared", async () => {
    render(<AddModal {...defaultProps} />);

    expect(await screen.findByText("COMP 248")).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(
      /Search courses by code or title\.\.\./i,
    );

    // filter
    fireEvent.change(searchInput, { target: { value: "SOEN" } });

    await waitFor(() => {
      expect(screen.getByText("SOEN 228")).toBeInTheDocument();
      expect(screen.queryByText("COMP 248")).not.toBeInTheDocument();
    });

    // clear -> full list returns
    fireEvent.change(searchInput, { target: { value: "" } });

    await waitFor(() => {
      expect(screen.getByText("COMP 248")).toBeInTheDocument();
      expect(screen.getByText("SOEN 228")).toBeInTheDocument();
      expect(screen.getByText("MATH 203")).toBeInTheDocument();
    });
  });

  it("calls onAdd with (course, type) when + button is clicked", async () => {
    render(<AddModal {...defaultProps} />);

    expect(await screen.findByText("COMP 248")).toBeInTheDocument();

    const addButton = screen.getByTitle("Add COMP 248 to exemptions");
    fireEvent.click(addButton);

    expect(mockOnAdd).toHaveBeenCalledTimes(1);
    expect(mockOnAdd).toHaveBeenCalledWith("COMP 248", "exemption");
  });

  it("renders correct copy when type is deficiency", () => {
    render(<AddModal type="deficiency" courses={defaultProps.courses} onAdd={mockOnAdd} />);
    expect(screen.getByText(/deficiency - Add Course/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Select a course to add to your deficiencys/i),
    ).toBeInTheDocument();
  });
});
