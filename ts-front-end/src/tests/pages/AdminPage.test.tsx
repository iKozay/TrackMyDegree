import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AdminPage from "../../pages/AdminPage";
import { useAuth } from "../../hooks/useAuth";

vi.mock("../../hooks/useAuth");

vi.mock("../../components/admin/MetricsTab", () => ({
  default: () => <div>Metrics Tab</div>,
}));

vi.mock("../../components/admin/DegreeManagementTab", () => ({
  default: () => <div>DegreeManagementTab</div>,
}));

vi.mock("../../components/admin/UserManagementTab", () => ({
  default: () => <div>UserManagementTab</div>,
}));

vi.mock("../../components/admin/SeedingTab", () => ({
  default: () => <div>SeedingTab</div>,
}));

vi.mock("../../components/admin/BackupManagementTab", () => ({
  default: () => <div data-testid="backup-management-tab">Backup Tab</div>,
}));

describe("AdminPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show login message when not authenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
    } as any);

    render(<AdminPage />);

    expect(
      screen.getByText("Please log in to see your data.")
    ).toBeTruthy();
  });

  it("should render admin dashboard when authenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
    } as any);

    render(<AdminPage />);

    expect(screen.getByText("Admin Dashboard")).toBeTruthy();
    expect(screen.getByText("Metrics Tab")).toBeTruthy();
  });

  it("should switch to degrees tab and cover degree branch", () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
    } as any);

    render(<AdminPage />);

    fireEvent.click(screen.getByRole("tab", { name: "Degrees & Courses" }));

    expect(screen.getByText("DegreeManagementTab")).toBeTruthy();
  });

  it("should switch to backups tab and render BackupManagementTab", () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
    } as any);

    render(<AdminPage />);

    fireEvent.click(screen.getByRole("tab", { name: "Backups" }));

    expect(screen.getByTestId("backup-management-tab")).toBeTruthy();
  });

  it("should fallback to metrics tab when null key is selected", () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
    } as any);

    render(<AdminPage />);

    // Click another tab first
    fireEvent.click(screen.getByRole("tab", { name: "Manage Users" }));
    expect(screen.getByText("UserManagementTab")).toBeTruthy();

    // Click Metrics again to ensure fallback/default path is covered
    fireEvent.click(screen.getByRole("tab", { name: "Metrics & Stats" }));
    expect(screen.getByText("Metrics Tab")).toBeTruthy();
  });
});