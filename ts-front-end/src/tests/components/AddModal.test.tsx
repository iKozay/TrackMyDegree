import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AddModal } from "../../components/AddModal";
import * as apiClient from "../../api/http-api-client";

vi.mock("../../api/http-api-client", () => ({
  api: {
    get: vi.fn(),
  },
}));

describe("AddModal", () => {
  const mockOnAdd = vi.fn();
  const mockOnClose = vi.fn();
  const mockApi = vi.mocked(apiClient.api);

  const defaultProps = {
    open: true,
    type: "exemption" as const,
    onAdd: mockOnAdd,
    onClose: mockOnClose,
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

  it("should not render when open is false", () => {
    render(<AddModal {...defaultProps} open={false} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should render modal when open is true", async () => {
    mockApi.get.mockResolvedValue(mockCourses);

    render(<AddModal {...defaultProps} />);

    expect(screen.getByRole("presentation")).toBeInTheDocument();
    expect(screen.getByText(/exemption - Add Course/i)).toBeInTheDocument();
  });

  it("should display loading state while fetching courses", async () => {
    mockApi.get.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockCourses), 100))
    );

    render(<AddModal {...defaultProps} />);

    expect(screen.getByText(/Loading courses.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText(/Loading courses.../i)).not.toBeInTheDocument();
    });
  });

  it("should fetch and display courses on mount", async () => {
    mockApi.get.mockResolvedValue(mockCourses);

    render(<AddModal {...defaultProps} />);

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith("/courses/all-codes");
    });

    await waitFor(() => {
      expect(screen.getByText("COMP 248")).toBeInTheDocument();
      expect(screen.getByText("COMP 249")).toBeInTheDocument();
      expect(screen.getByText("SOEN 228")).toBeInTheDocument();
      expect(screen.getByText("MATH 203")).toBeInTheDocument();
    });
  });

  it("should display error message when API call fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockApi.get.mockRejectedValue(new Error("Network error"));

    render(<AddModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load courses. Please try again./i)).toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore();
  });

  it("should filter courses based on search term", async () => {
    mockApi.get.mockResolvedValue(mockCourses);

    render(<AddModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("COMP 248")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search courses by code or title.../i);
    fireEvent.change(searchInput, { target: { value: "COMP" } });

    await waitFor(() => {
      expect(screen.getByText("COMP 248")).toBeInTheDocument();
      expect(screen.getByText("COMP 249")).toBeInTheDocument();
      expect(screen.queryByText("SOEN 228")).not.toBeInTheDocument();
      expect(screen.queryByText("MATH 203")).not.toBeInTheDocument();
    });
  });

  it("should show no results message when search has no matches", async () => {
    mockApi.get.mockResolvedValue(mockCourses);

    render(<AddModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("COMP 248")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search courses by code or title.../i);
    fireEvent.change(searchInput, { target: { value: "XXXX" } });

    await waitFor(() => {
      expect(screen.getByText(/No courses found matching your search./i)).toBeInTheDocument();
    });
  });

  it("should show no courses available message when courses list is empty", async () => {
    mockApi.get.mockResolvedValue({ courseCodes: [] });

    render(<AddModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/No courses available./i)).toBeInTheDocument();
    });
  });

  it("should reset filtered courses when search is cleared", async () => {
    mockApi.get.mockResolvedValue(mockCourses);

    render(<AddModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("COMP 248")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search courses by code or title.../i);
    
    // Filter
    fireEvent.change(searchInput, { target: { value: "COMP" } });
    await waitFor(() => {
      expect(screen.queryByText("SOEN 228")).not.toBeInTheDocument();
    });

    // Clear
    fireEvent.change(searchInput, { target: { value: "" } });
    await waitFor(() => {
      expect(screen.getByText("COMP 248")).toBeInTheDocument();
      expect(screen.getByText("SOEN 228")).toBeInTheDocument();
    });
  });

  it("should call onAdd when add button is clicked", async () => {
    mockApi.get.mockResolvedValue(mockCourses);

    render(<AddModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("COMP 248")).toBeInTheDocument();
    });

    const addButton = screen.getByTitle("Add COMP 248 to exemptions");
    fireEvent.click(addButton);

    expect(mockOnAdd).toHaveBeenCalledTimes(1);
    expect(mockOnAdd).toHaveBeenCalledWith("COMP 248", "exemption");
  });

  it("should call onClose when close button is clicked", async () => {
    mockApi.get.mockResolvedValue(mockCourses);

    render(<AddModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("COMP 248")).toBeInTheDocument();
    });

    const closeButton = screen.getByRole("button", { name: /×/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("should call onClose when backdrop is clicked", async () => {
    mockApi.get.mockResolvedValue(mockCourses);

    render(<AddModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("COMP 248")).toBeInTheDocument();
    });

    const backdrop = screen.getByRole("presentation");
    fireEvent.click(backdrop);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("should reset search term and error when closing", async () => {
    mockApi.get.mockResolvedValue(mockCourses);

    render(<AddModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("COMP 248")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search courses by code or title.../i);
    fireEvent.change(searchInput, { target: { value: "COMP" } });

    const closeButton = screen.getByRole("button", { name: /×/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("should perform case-insensitive search", async () => {
    mockApi.get.mockResolvedValue(mockCourses);

    render(<AddModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("COMP 248")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search courses by code or title.../i);
    fireEvent.change(searchInput, { target: { value: "comp" } });

    await waitFor(() => {
      expect(screen.getByText("COMP 248")).toBeInTheDocument();
      expect(screen.getByText("COMP 249")).toBeInTheDocument();
    });
  });
});
