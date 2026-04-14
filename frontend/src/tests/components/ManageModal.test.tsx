import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ManageModal } from "../../components/ManageModal";
import type { CoursePoolData } from "@trackmydegree/shared";
import type { CourseMap } from "../../types/timeline.types";

describe("ManageModal", () => {
  const mockOnAdd = vi.fn();
  const mockOnRemove = vi.fn();

  const mockCourses: CourseMap = {
    "COMP 248": {
      id: "COMP 248",
      title: "Object-Oriented Programming I",
      credits: 3,
      description: "Intro to OOP",
      offeredIn: [],
      rules: [],
      status: { status: "incomplete", semester: null },
    },
    "COMP 249": {
      id: "COMP 249",
      title: "Object-Oriented Programming II",
      credits: 3,
      description: "Advanced OOP",
      offeredIn: [],
      rules: [],
      status: { status: "incomplete", semester: null },
    },
    "SOEN 228": {
      id: "SOEN 228",
      title: "System Hardware",
      credits: 3,
      description: "Hardware systems",
      offeredIn: [],
      rules: [],
      status: { status: "incomplete", semester: null },
    },
  };

  const emptyPool: CoursePoolData[] = [
    {
      _id: "exemptions",
      name: "exemptions",
      creditsRequired: 0,
      courses: [],
      rules: [],
    },
  ];

  const poolWithCourses: CoursePoolData[] = [
    {
      _id: "exemptions",
      name: "exemptions",
      creditsRequired: 6,
      courses: ["COMP 248", "COMP 249"],
      rules: [],
    },
  ];

  const deficiencyPool: CoursePoolData[] = [
    {
      _id: "deficiencies",
      name: "deficiencies",
      creditsRequired: 3,
      courses: ["SOEN 228"],
      rules: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // --- Header ---

  it("renders correct title for exemption type", () => {
    render(
      <ManageModal
        type="exemption"
        courses={mockCourses}
        pools={emptyPool}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
      />,
    );

    expect(screen.getByText(/Manage Exemptions/i)).toBeInTheDocument();
  });

  it("renders correct title for deficiency type", () => {
    render(
      <ManageModal
        type="deficiency"
        courses={mockCourses}
        pools={deficiencyPool}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
      />,
    );

    expect(screen.getByText(/Manage Deficiencies/i)).toBeInTheDocument();
  });

  it("renders subtitle describing the purpose", () => {
    render(
      <ManageModal
        type="exemption"
        courses={mockCourses}
        pools={emptyPool}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
      />,
    );

    expect(
      screen.getByText(/view, add, or remove courses from your exemptions/i),
    ).toBeInTheDocument();
  });

  // --- Current courses section ---

  it("shows empty message when no courses are in the pool", () => {
    render(
      <ManageModal
        type="exemption"
        courses={mockCourses}
        pools={emptyPool}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
      />,
    );

    expect(screen.getByText(/no exemptions added yet/i)).toBeInTheDocument();
  });

  it("lists current courses in the pool", () => {
    render(
      <ManageModal
        type="exemption"
        courses={mockCourses}
        pools={poolWithCourses}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
      />,
    );

    // Both current courses should appear in the "Current Exemptions" section
    expect(screen.getAllByText("COMP 248").length).toBeGreaterThan(0);
    expect(screen.getAllByText("COMP 249").length).toBeGreaterThan(0);
  });

  it("shows badge with count of current courses", () => {
    render(
      <ManageModal
        type="exemption"
        courses={mockCourses}
        pools={poolWithCourses}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
      />,
    );

    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("does not show badge when pool is empty", () => {
    render(
      <ManageModal
        type="exemption"
        courses={mockCourses}
        pools={emptyPool}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
      />,
    );

    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("renders remove button for each current course", () => {
    render(
      <ManageModal
        type="exemption"
        courses={mockCourses}
        pools={poolWithCourses}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
      />,
    );

    const removeBtns = screen.getAllByTitle(/remove .* from exemptions/i);
    expect(removeBtns).toHaveLength(2);
  });

  it("calls onRemove with correct args when remove button is clicked", () => {
    render(
      <ManageModal
        type="exemption"
        courses={mockCourses}
        pools={poolWithCourses}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
      />,
    );

    const removeBtn = screen.getByTitle("Remove COMP 248 from exemptions");
    fireEvent.click(removeBtn);

    expect(mockOnRemove).toHaveBeenCalledTimes(1);
    expect(mockOnRemove).toHaveBeenCalledWith("COMP 248", "exemption");
  });

  it("calls onRemove with correct type for deficiency", () => {
    render(
      <ManageModal
        type="deficiency"
        courses={mockCourses}
        pools={deficiencyPool}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
      />,
    );

    const removeBtn = screen.getByTitle("Remove SOEN 228 from deficiencies");
    fireEvent.click(removeBtn);

    expect(mockOnRemove).toHaveBeenCalledWith("SOEN 228", "deficiency");
  });

  // --- Available courses section ---

  it("shows add section header", () => {
    render(
      <ManageModal
        type="exemption"
        courses={mockCourses}
        pools={emptyPool}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
      />,
    );

    expect(screen.getByText(/Add Exemption/i)).toBeInTheDocument();
  });

  it("excludes already-added courses from the available list", () => {
    render(
      <ManageModal
        type="exemption"
        courses={mockCourses}
        pools={poolWithCourses}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
      />,
    );

    // COMP 248 and COMP 249 are in the pool; only SOEN 228 should appear in add section
    const addBtns = screen.getAllByTitle(/add .* to exemptions/i);
    expect(addBtns).toHaveLength(1);
    expect(screen.getByTitle("Add SOEN 228 to exemptions")).toBeInTheDocument();
  });

  it("filters available courses based on search term", async () => {
    render(
      <ManageModal
        type="exemption"
        courses={mockCourses}
        pools={emptyPool}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
      />,
    );

    const searchInput = screen.getByPlaceholderText(
      /search courses by code or title/i,
    );
    fireEvent.change(searchInput, { target: { value: "COMP" } });

    await waitFor(() => {
      expect(screen.getByTitle("Add COMP 248 to exemptions")).toBeInTheDocument();
      expect(screen.getByTitle("Add COMP 249 to exemptions")).toBeInTheDocument();
      expect(screen.queryByTitle("Add SOEN 228 to exemptions")).not.toBeInTheDocument();
    });
  });

  it("performs case-insensitive search filtering", async () => {
    render(
      <ManageModal
        type="exemption"
        courses={mockCourses}
        pools={emptyPool}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
      />,
    );

    const searchInput = screen.getByPlaceholderText(
      /search courses by code or title/i,
    );
    fireEvent.change(searchInput, { target: { value: "comp" } });

    await waitFor(() => {
      expect(screen.getByTitle("Add COMP 248 to exemptions")).toBeInTheDocument();
      expect(screen.getByTitle("Add COMP 249 to exemptions")).toBeInTheDocument();
    });
  });

  it("shows 'no results' message when search has no matches", async () => {
    render(
      <ManageModal
        type="exemption"
        courses={mockCourses}
        pools={emptyPool}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
      />,
    );

    const searchInput = screen.getByPlaceholderText(
      /search courses by code or title/i,
    );
    fireEvent.change(searchInput, { target: { value: "XXXX" } });

    expect(
      await screen.findByText(/no courses found matching your search/i),
    ).toBeInTheDocument();
  });

  it("shows 'all courses added' message when all courses are in the pool", async () => {
    const allCoursesPool: CoursePoolData[] = [
      {
        _id: "exemptions",
        name: "exemptions",
        creditsRequired: 9,
        courses: ["COMP 248", "COMP 249", "SOEN 228"],
        rules: [],
      },
    ];

    render(
      <ManageModal
        type="exemption"
        courses={mockCourses}
        pools={allCoursesPool}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
      />,
    );

    expect(
      await screen.findByText(/all courses have already been added/i),
    ).toBeInTheDocument();
  });

  it("resets filtered courses when search is cleared", async () => {
    render(
      <ManageModal
        type="exemption"
        courses={mockCourses}
        pools={emptyPool}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
      />,
    );

    const searchInput = screen.getByPlaceholderText(
      /search courses by code or title/i,
    );

    fireEvent.change(searchInput, { target: { value: "SOEN" } });

    await waitFor(() => {
      expect(screen.getByTitle("Add SOEN 228 to exemptions")).toBeInTheDocument();
      expect(
        screen.queryByTitle("Add COMP 248 to exemptions"),
      ).not.toBeInTheDocument();
    });

    fireEvent.change(searchInput, { target: { value: "" } });

    await waitFor(() => {
      expect(screen.getByTitle("Add COMP 248 to exemptions")).toBeInTheDocument();
      expect(screen.getByTitle("Add COMP 249 to exemptions")).toBeInTheDocument();
      expect(screen.getByTitle("Add SOEN 228 to exemptions")).toBeInTheDocument();
    });
  });

  it("calls onAdd with correct args when + button is clicked", () => {
    render(
      <ManageModal
        type="exemption"
        courses={mockCourses}
        pools={emptyPool}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
      />,
    );

    const addBtn = screen.getByTitle("Add COMP 248 to exemptions");
    fireEvent.click(addBtn);

    expect(mockOnAdd).toHaveBeenCalledTimes(1);
    expect(mockOnAdd).toHaveBeenCalledWith("COMP 248", "exemption");
  });

  it("calls onAdd with correct type for deficiency", () => {
    render(
      <ManageModal
        type="deficiency"
        courses={mockCourses}
        pools={emptyPool.map((p) => ({ ...p, _id: "deficiencies", name: "deficiencies" }))}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
      />,
    );

    const addBtn = screen.getByTitle("Add COMP 248 to deficiencies");
    fireEvent.click(addBtn);

    expect(mockOnAdd).toHaveBeenCalledWith("COMP 248", "deficiency");
  });

  it("renders course titles in the available list when provided", () => {
    render(
      <ManageModal
        type="exemption"
        courses={mockCourses}
        pools={emptyPool}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
      />,
    );

    expect(screen.getByText("Object-Oriented Programming I")).toBeInTheDocument();
  });

  it("renders course titles in the current list when provided", () => {
    render(
      <ManageModal
        type="exemption"
        courses={mockCourses}
        pools={poolWithCourses}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
      />,
    );

    expect(
      screen.getAllByText("Object-Oriented Programming I").length,
    ).toBeGreaterThan(0);
  });

  it("renders no courses when courses map is empty", () => {
    render(
      <ManageModal
        type="exemption"
        courses={{}}
        pools={emptyPool}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
      />,
    );

    expect(
      screen.getByText(/all courses have already been added/i),
    ).toBeInTheDocument();
  });
});
