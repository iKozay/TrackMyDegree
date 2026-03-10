import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AddModal } from "../../components/AddModal";
import { api } from "../../api/http-api-client";

// Mock the api module
vi.mock("../../api/http-api-client", () => ({
  api: {
    get: vi.fn(),
  },
}));

describe("AddModal (content)", () => {
  const mockOnAdd = vi.fn();

  const defaultProps = {
    type: "exemption" as const,
    onAdd: mockOnAdd,
  };

  const mockCourses = {
    courseCodes: ["COMP 248", "COMP 249", "SOEN 228", "MATH 203"],
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

  it("fetches and displays courses on mount", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockCourses as any);

    render(<AddModal {...defaultProps} />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/courses/all-codes");
    });

    expect(await screen.findByText("COMP 248")).toBeInTheDocument();
    expect(screen.getByText("COMP 249")).toBeInTheDocument();
    expect(screen.getByText("SOEN 228")).toBeInTheDocument();
    expect(screen.getByText("MATH 203")).toBeInTheDocument();
  });

  it("shows loading state while fetching courses", async () => {
    vi.mocked(api.get).mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(mockCourses), 50),
        ) as any,
    );

    render(<AddModal {...defaultProps} />);

    expect(screen.getByText(/Loading courses.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText(/Loading courses.../i)).not.toBeInTheDocument();
    });
  });

  it("shows error message when API call fails", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    vi.mocked(api.get).mockRejectedValueOnce(new Error("Network error"));

    render(<AddModal {...defaultProps} />);

    expect(
      await screen.findByText(/Failed to load courses\. Please try again\./i),
    ).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it("filters courses based on search term", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockCourses as any);

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
    vi.mocked(api.get).mockResolvedValueOnce(mockCourses as any);

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
    vi.mocked(api.get).mockResolvedValueOnce(mockCourses as any);

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

  it("shows 'no courses available' when API returns empty list and search is empty", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ courseCodes: [] } as any);

    render(<AddModal {...defaultProps} />);

    expect(
      await screen.findByText(/No courses available\./i),
    ).toBeInTheDocument();
  });

  it("resets filtered courses when search is cleared", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockCourses as any);

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
    vi.mocked(api.get).mockResolvedValueOnce(mockCourses as any);

    render(<AddModal {...defaultProps} />);

    expect(await screen.findByText("COMP 248")).toBeInTheDocument();

    const addButton = screen.getByTitle("Add COMP 248 to exemptions");
    fireEvent.click(addButton);

    expect(mockOnAdd).toHaveBeenCalledTimes(1);
    expect(mockOnAdd).toHaveBeenCalledWith("COMP 248", "exemption");
  });

  it("renders correct copy when type is deficiency", () => {
    render(<AddModal type="deficiency" onAdd={mockOnAdd} />);
    expect(screen.getByText(/deficiency - Add Course/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Select a course to add to your deficiencys/i),
    ).toBeInTheDocument();
  });
});
