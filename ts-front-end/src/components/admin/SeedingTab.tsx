import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Spinner } from 'react-bootstrap';
import { api } from '../../api/http-api-client';
import type { DbConnectionStatus, SeedResult } from '@shared/admin';

const SeedingTab: React.FC = () => {
  const [dbStatus, setDbStatus] = useState<DbConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [seedingAll, setSeedingAll] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);

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

  const handleSeedAll = async () => {
    setSeedingAll(true);
    setResult(null);
    try {
      const data = await api.get<SeedResult>('/admin/seed-data');
      setResult(data as SeedResult);
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : 'Seeding failed' });
    } finally {
      setSeedingAll(false);
    }
  };

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

      {result && (
        <Alert variant={result.success ? 'success' : 'danger'} dismissible onClose={() => setResult(null)} className="mb-4">
          <strong>{result.success ? 'Success' : 'Error'}:</strong> {result.message}
          {result.degreesSeeded !== undefined && <span className="ms-2"><Badge bg="light" text="dark">{result.degreesSeeded} degrees</Badge></span>}
          {result.coursesSeeded !== undefined && <span className="ms-2"><Badge bg="light" text="dark">{result.coursesSeeded} courses</Badge></span>}
        </Alert>
      )}

      <Card className="mb-4">
        <Card.Header><strong>Seed All Degrees</strong></Card.Header>
        <Card.Body>
          <p className="text-muted small">Parses all degree JSON files and upserts degrees, course pools, and courses into the database.</p>
          <Button variant="primary" onClick={() => void handleSeedAll()} disabled={seedingAll}>
            {seedingAll ? <><Spinner animation="border" size="sm" className="me-2" />Seeding…</> : 'Seed All Degrees'}
          </Button>
        </Card.Body>
      </Card>
    </div>
  );
};

export default SeedingTab;
