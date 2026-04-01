import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import BackupManagementTab from "../../components/admin/BackupManagementTab";
import { api } from "../../api/http-api-client";

vi.mock("../../../api/http-api-client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockGet = api.get as ReturnType<typeof vi.fn>;
const mockPost = api.post as ReturnType<typeof vi.fn>;

describe("BackupManagementTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("alert", vi.fn());
  });

  it("should fetch and render backups on mount", async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: ["backup1.sql", "backup2.sql"],
    });

    render(<BackupManagementTab />);

    expect(await screen.findByText("backup1.sql")).toBeTruthy();
    expect(screen.getByText("backup2.sql")).toBeTruthy();
  });

  it("should show fetch error when API fails", async () => {
    mockGet.mockResolvedValue({
      success: false,
      message: "Failed to fetch backups",
    });

    render(<BackupManagementTab />);

    expect(await screen.findByText("Failed to fetch backups")).toBeTruthy();
  });

  it("should create backup successfully", async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: ["backup1.sql"],
    });

    mockPost.mockResolvedValue({
      success: true,
    });

    render(<BackupManagementTab />);

    fireEvent.click(await screen.findByRole("button", { name: "Create Backup" }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "/admin/create-backup",
        {},
        { credentials: "include" }
      );
    });

    expect(global.alert).toHaveBeenCalledWith("Backup created successfully");
  });

  it("should restore selected backup successfully", async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: ["backup1.sql"],
    });

    mockPost.mockResolvedValue({
      success: true,
    });

    render(<BackupManagementTab />);

    const select = await screen.findByRole("combobox");
    fireEvent.change(select, { target: { value: "backup1.sql" } });

    fireEvent.click(screen.getByRole("button", { name: "Restore Backup" }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "/admin/restore-backup",
        { backupName: "backup1.sql" },
        { credentials: "include" }
      );
    });

    expect(global.alert).toHaveBeenCalledWith(
      "Database restored successfully"
    );
  });

  it("should delete selected backup successfully", async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: ["backup1.sql"],
    });

    mockPost.mockResolvedValue({
      success: true,
    });

    render(<BackupManagementTab />);

    const select = await screen.findByRole("combobox");
    fireEvent.change(select, { target: { value: "backup1.sql" } });

    fireEvent.click(screen.getByRole("button", { name: "Delete Backup" }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "/admin/delete-backup",
        { backupName: "backup1.sql" },
        { credentials: "include" }
      );
    });

    expect(global.alert).toHaveBeenCalledWith(
      "Backup deleted successfully"
    );
  });

  it("should show create backup error", async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: [],
    });

    mockPost.mockResolvedValue({
      success: false,
      message: "Failed to create backup",
    });

    render(<BackupManagementTab />);

    fireEvent.click(await screen.findByRole("button", { name: "Create Backup" }));

    expect(await screen.findByText("Failed to create backup")).toBeTruthy();
  });

  it("should show restore error", async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: ["backup1.sql"],
    });

    mockPost.mockResolvedValue({
      success: false,
      message: "Restore failed",
    });

    render(<BackupManagementTab />);

    const select = await screen.findByRole("combobox");
    fireEvent.change(select, { target: { value: "backup1.sql" } });

    fireEvent.click(screen.getByRole("button", { name: "Restore Backup" }));

    expect(await screen.findByText("Restore failed")).toBeTruthy();
  });

  it("should show delete error", async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: ["backup1.sql"],
    });

    mockPost.mockResolvedValue({
      success: false,
      message: "Deletion failed",
    });

    render(<BackupManagementTab />);

    const select = await screen.findByRole("combobox");
    fireEvent.change(select, { target: { value: "backup1.sql" } });

    fireEvent.click(screen.getByRole("button", { name: "Delete Backup" }));

    expect(await screen.findByText("Deletion failed")).toBeTruthy();
  });

  it("should disable restore and delete buttons when no backup selected", async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: ["backup1.sql"],
    });

    render(<BackupManagementTab />);

    await screen.findByText("backup1.sql");

    expect(screen.getByRole("button", { name: "Restore Backup" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete Backup" })).toBeDisabled();
  });
});