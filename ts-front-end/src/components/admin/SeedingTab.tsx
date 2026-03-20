import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Spinner } from 'react-bootstrap';
import { api } from '../../api/http-api-client';
import type { DbConnectionStatus } from '@shared/admin';

const SeedingTab: React.FC = () => {
  const [dbStatus, setDbStatus] = useState<DbConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const statusData = await api.get<DbConnectionStatus>('/admin/connection-status').catch(() => null);
      if (statusData) setDbStatus(statusData as DbConnectionStatus);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadInitial(); }, [loadInitial]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <Spinner animation="border" role="status"><span className="visually-hidden">Loading…</span></Spinner>
      </div>
    );
  }

  return (
    <div className="py-3">
      {dbStatus && (
        <Alert variant={dbStatus.connected ? 'success' : 'danger'} className="mb-4">
          <strong>Database:</strong> {dbStatus.connected ? 'Connected' : 'Disconnected'}
          {dbStatus.message && ` — ${dbStatus.message}`}
        </Alert>
      )}
    </div>
  );
};

export default SeedingTab;
