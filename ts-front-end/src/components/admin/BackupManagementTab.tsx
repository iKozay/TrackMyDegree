import React, { useCallback, useEffect, useState } from "react";
import { Alert, Button, Form, Spinner, Stack } from "react-bootstrap";
import { api } from "../../api/http-api-client";

type ApiResult = {
  success: boolean;
  message?: string;
  data?: string[];
};

const BackupManagementTab: React.FC = () => {
  const [backups, setBackups] = useState<string[]>([]);
  const [selectedBackup, setSelectedBackup] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBackups = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.get<ApiResult>(
        "/admin/fetch-backups",
        { credentials: "include" },
      );

      if (!data.success) throw new Error(data.message || "Failed to fetch backups");
      setBackups(data.data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error fetching backups";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createBackup = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.post<ApiResult>(
        "/admin/create-backup",
        {},
        { credentials: "include" },
      );

      if (!data.success) throw new Error(data.message || "Failed to create backup");
      await fetchBackups();
      alert("Backup created successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error creating backup";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const restoreBackup = async () => {
    if (!selectedBackup) return;

    setLoading(true);
    setError(null);

    try {
      const data = await api.post<ApiResult>(
        "/admin/restore-backup",
        { backupName: selectedBackup },
        { credentials: "include" },
      );

      if (!data.success) throw new Error(data.message || "Restore failed");
      alert("Database restored successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error restoring backup";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const deleteBackup = async () => {
    if (!selectedBackup) return;

    setLoading(true);
    setError(null);

    try {
      const data = await api.post<ApiResult>(
        "/admin/delete-backup",
        { backupName: selectedBackup },
        { credentials: "include" },
      );

      if (!data.success) throw new Error(data.message || "Deletion failed");

      setSelectedBackup("");
      await fetchBackups();
      alert("Backup deleted successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error deleting backup";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  return (
    <div>
      <div className="mb-4">
        <h4 className="mb-1">Backup Management</h4>
        <small className="text-muted">
          Create, restore, review, and delete database backups.
        </small>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Stack direction="horizontal" gap={3} className="flex-wrap align-items-center">
        <Button onClick={createBackup} disabled={loading}>
          {loading ? <Spinner size="sm" /> : "Create Backup"}
        </Button>

        <Button variant="secondary" onClick={fetchBackups} disabled={loading}>
          Refresh List
        </Button>

        <Form.Select
          value={selectedBackup}
          onChange={(e) => setSelectedBackup(e.target.value)}
          style={{ width: "350px" }}
          disabled={loading}
        >
          <option value="">Select a backup...</option>
          {backups.map((backup) => (
            <option key={backup} value={backup}>
              {backup}
            </option>
          ))}
        </Form.Select>

        <Button variant="success" onClick={restoreBackup} disabled={loading || !selectedBackup}>
          Restore Backup
        </Button>

        <Button variant="danger" onClick={deleteBackup} disabled={loading || !selectedBackup}>
          Delete Backup
        </Button>
      </Stack>
    </div>
  );
};

export default BackupManagementTab;