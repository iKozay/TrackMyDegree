import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import BackupManagementTab from "../../components/admin/BackupManagementTab";
import { api } from "../../api/http-api-client";

vi.mock("../../api/http-api-client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("BackupManagementTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("alert", vi.fn());
  });

  it("should fetch and render backups on mount", async () => {
    vi.mocked(api.get).mockResolvedValue({
      success: true,
      data: ["backup1.sql", "backup2.sql"],
    });

    render(<BackupManagementTab />);

    expect(await screen.findByText("backup1.sql")).toBeTruthy();
    expect(screen.getByText("backup2.sql")).toBeTruthy();
  });

  it("should show fetch error when API returns success false", async () => {
    vi.mocked(api.get).mockResolvedValue({
      success: false,
      message: "Failed to fetch backups",
    });

    render(<BackupManagementTab />);

    expect(await screen.findByText("Failed to fetch backups")).toBeTruthy();
  });

  it("should create backup successfully", async () => {
    vi.mocked(api.get).mockResolvedValue({
      success: true,
      data: ["backup1.sql"],
    });

    vi.mocked(api.post).mockResolvedValue({
      success: true,
    });

    render(<BackupManagementTab />);

    const button = await screen.findByRole("button", {
      name: "Create Backup",
    });

    fireEvent.click(button);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/admin/create-backup",
        {},
        { credentials: "include" }
      );
    });

    expect(global.alert).toHaveBeenCalledWith(
      "Backup created successfully"
    );
  });

  it("should restore selected backup successfully", async () => {
    vi.mocked(api.get).mockResolvedValue({
      success: true,
      data: ["backup1.sql"],
    });

    vi.mocked(api.post).mockResolvedValue({
      success: true,
    });

    render(<BackupManagementTab />);

    const select = await screen.findByRole("combobox");
    fireEvent.change(select, { target: { value: "backup1.sql" } });

    fireEvent.click(screen.getByRole("button", { name: "Restore Backup" }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
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
    vi.mocked(api.get).mockResolvedValue({
      success: true,
      data: ["backup1.sql"],
    });

    vi.mocked(api.post).mockResolvedValue({
      success: true,
    });

    render(<BackupManagementTab />);

    const select = await screen.findByRole("combobox");
    fireEvent.change(select, { target: { value: "backup1.sql" } });

    const deleteButton = screen.getByRole("button", { name: "Delete Backup" });
    await waitFor(() => {
      expect(deleteButton).toBeEnabled();
    });

    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/admin/delete-backup",
        { backupName: "backup1.sql" },
        { credentials: "include" }
      );
    });

    expect(global.alert).toHaveBeenCalledWith(
      "Backup deleted successfully"
    );
  });

  it("should not restore when no backup is selected", async () => {
    vi.mocked(api.get).mockResolvedValue({
      success: true,
      data: ["backup1.sql"],
    });

    render(<BackupManagementTab />);

    await screen.findByText("backup1.sql");

    fireEvent.click(screen.getByRole("button", { name: "Restore Backup" }));

    expect(api.post).not.toHaveBeenCalledWith(
      "/admin/restore-backup",
      expect.anything(),
      expect.anything()
    );
  });

  it("should not delete when no backup is selected", async () => {
    vi.mocked(api.get).mockResolvedValue({
      success: true,
      data: ["backup1.sql"],
    });

    render(<BackupManagementTab />);

    await screen.findByText("backup1.sql");

    fireEvent.click(screen.getByRole("button", { name: "Delete Backup" }));

    expect(api.post).not.toHaveBeenCalledWith(
      "/admin/delete-backup",
      expect.anything(),
      expect.anything()
    );
  });

  it("should show create backup error", async () => {
    vi.mocked(api.get).mockResolvedValue({
      success: true,
      data: [],
    });

    vi.mocked(api.post).mockResolvedValue({
      success: false,
      message: "Failed to create backup",
    });

    render(<BackupManagementTab />);

    fireEvent.click(await screen.findByRole("button", { name: "Create Backup" }));

    expect(
      await screen.findByText("Failed to create backup")
    ).toBeTruthy();
  });

  it("should show restore error", async () => {
    vi.mocked(api.get).mockResolvedValue({
      success: true,
      data: ["backup1.sql"],
    });

    vi.mocked(api.post).mockResolvedValue({
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
    vi.mocked(api.get).mockResolvedValue({
      success: true,
      data: ["backup1.sql"],
    });

    vi.mocked(api.post).mockResolvedValue({
      success: false,
      message: "Deletion failed",
    });

    render(<BackupManagementTab />);

    const select = await screen.findByRole("combobox");
    fireEvent.change(select, { target: { value: "backup1.sql" } });

    fireEvent.click(screen.getByRole("button", { name: "Delete Backup" }));

    expect(await screen.findByText("Deletion failed")).toBeTruthy();
  });
});