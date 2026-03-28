import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

import StudentPage from "../../pages/StudentPage";

/* Mocks */

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockUseAuth = vi.fn();

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../../api/http-api-client", () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { api } from "../../api/http-api-client";

/* Helpers */

const renderPage = () => {
  return render(
    <MemoryRouter>
      <StudentPage />
    </MemoryRouter>
  );
};

/* Tests */

describe("StudentPage", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  /* Auth */

  test("shows login message when not authenticated", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
    });

    renderPage();

    expect(
      screen.getByText("Please log in to see your data.")
    ).toBeInTheDocument();
  });

  /* Redirect */

  test("handles redirect after login", async () => {
    localStorage.setItem("redirectAfterLogin", "/timeline/edit/123");

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: "1" },
    });

    vi.mocked(api.get).mockResolvedValueOnce({
      user: { _id: "1", email: "a", fullname: "b" },
      timelines: [],
    });

    renderPage();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        "/timeline/edit/123",
        { replace: true }
      );
    });

    expect(localStorage.getItem("redirectAfterLogin")).toBeNull();
  });

  /* Fetch data */

  test("fetches and displays timelines", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: "1", name: "Test", email: "test@test.com" },
    });

    vi.mocked(api.get).mockResolvedValueOnce({
      user: { _id: "1", email: "test@test.com", fullname: "Test" },
      timelines: [
        { _id: "t1", name: "Timeline 1" },
        { _id: "t2", name: "Timeline 2" },
      ],
    });

    renderPage();

    expect(await screen.findByText("Timeline 1")).toBeInTheDocument();
    expect(screen.getByText("Timeline 2")).toBeInTheDocument();
  });

  /* API error */

  test("handles API error gracefully", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: "1" },
    });

    vi.mocked(api.get).mockRejectedValueOnce(new Error("API Error"));

    renderPage();

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  /* Name update */

  test("updates name successfully", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: "1", name: "John" },
    });

    vi.mocked(api.get).mockResolvedValueOnce({
      user: { _id: "1", email: "a", fullname: "John" },
      timelines: [],
    });

    vi.mocked(api.patch).mockResolvedValueOnce({});

    renderPage();

    const editBtn = await screen.findByTitle("Edit name");
    fireEvent.click(editBtn);

    const input = await screen.findByDisplayValue("John") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "New Name" } });

    const saveBtn = screen.getByTitle("Save");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalled();
    });
  });

  /* Password validation */

  test("shows error when current password is empty", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: "1" },
    });

    vi.mocked(api.get).mockResolvedValueOnce({
      user: { _id: "1", email: "a", fullname: "John" },
      timelines: [],
    });

    renderPage();

    const toggle = await screen.findByText(/change password/i);
    fireEvent.click(toggle);

    const saveBtn = await screen.findByText(/update password/i);
    fireEvent.click(saveBtn);

    expect(
      screen.getByText("Current password is required.")
    ).toBeInTheDocument();
  });

  /* Delete */

  test("deletes a timeline", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: "1" },
    });

    vi.mocked(api.get).mockResolvedValueOnce({
      user: { _id: "1", email: "a", fullname: "John" },
      timelines: [{ _id: "1", name: "Test Timeline" }],
    });

    vi.mocked(api.delete).mockResolvedValueOnce({});

    renderPage();

    const deleteBtn = await screen.findByTitle("Delete");
    fireEvent.click(deleteBtn);

    const confirmBtn = await screen.findByText(/yes, Delete/i);
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalled();
    });
  });
});
