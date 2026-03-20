import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, ListGroup, Row, Spinner } from 'react-bootstrap';
import { api } from '../../api/http-api-client';
import type { DbConnectionStatus, SeedResult, CollectionInfo } from '@shared/admin';
import type { DegreeData } from '@shared/degree';

const SeedingTab: React.FC = () => {
  const [degrees, setDegrees] = useState<DegreeData[]>([]);
  const [collections, setCollections] = useState<CollectionInfo[]>([]);
  const [clearingCollection, setClearingCollection] = useState<string | null>(null);
  const [selectedDegree, setSelectedDegree] = useState('');
  const [dbStatus, setDbStatus] = useState<DbConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [seedingAll, setSeedingAll] = useState(false);
  const [seedingOne, setSeedingOne] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const [degreesData, collectionsData, statusData] = await Promise.allSettled([
        api.get<DegreeData[]>('/degree'),
        api.get<{ name: string }[]>('/admin/collections'),
        api.get<DbConnectionStatus>('/admin/connection-status'),
      ]);
      if (degreesData.status === 'fulfilled') setDegrees(degreesData.value as DegreeData[]);
      if (collectionsData.status === 'fulfilled') setCollections((collectionsData.value as { name: string }[]).map((c) => ({ name: c.name, count: 0 })));
      if (statusData.status === 'fulfilled') setDbStatus(statusData.value as DbConnectionStatus);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadInitial(); }, [loadInitial]);

  const handleClearCollection = async (name: string) => {
    if (!window.confirm(`Clear all documents in "${name}"? This cannot be undone.`)) return;
    setClearingCollection(name);
    try {
      await api.delete(`/admin/collections/${name}/clear`);
      setResult({ success: true, message: `Collection "${name}" cleared.` });
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : 'Clear failed' });
    } finally {
      setClearingCollection(null);
    }
  };

  const handleSeedOne = async () => {
    if (!selectedDegree) return;
    setSeedingOne(true);
    setResult(null);
    try {
      const data = await api.get<SeedResult>(`/admin/seed-data/${encodeURIComponent(selectedDegree)}`);
      setResult(data as SeedResult);
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : 'Seeding failed' });
    } finally {
      setSeedingOne(false);
    }
  };

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

      <Row className="g-4 mb-4">
        <Col md={6}>
          <Card className="h-100">
            <Card.Header><strong>Seed All Degrees</strong></Card.Header>
            <Card.Body>
              <p className="text-muted small">Parses all degree JSON files and upserts degrees, course pools, and courses into the database.</p>
              <Button variant="primary" onClick={() => void handleSeedAll()} disabled={seedingAll}>
                {seedingAll ? <><Spinner animation="border" size="sm" className="me-2" />Seeding…</> : 'Seed All Degrees'}
              </Button>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="h-100">
            <Card.Header><strong>Seed Specific Degree</strong></Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Select Degree</Form.Label>
                <Form.Select value={selectedDegree} onChange={(e) => setSelectedDegree(e.target.value)}>
                  <option value="">— Choose a degree —</option>
                  {degrees.map((d) => <option key={d._id} value={d.name}>{d.name}</option>)}
                </Form.Select>
              </Form.Group>
              <Button variant="outline-primary" onClick={() => void handleSeedOne()} disabled={!selectedDegree || seedingOne}>
                {seedingOne ? <><Spinner animation="border" size="sm" className="me-2" />Seeding…</> : 'Seed Selected Degree'}
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card>
        <Card.Header><strong>Collection Management</strong></Card.Header>
        <Card.Body>
          {collections.length === 0 ? (
            <p className="text-muted">No collections found.</p>
          ) : (
            <ListGroup>
              {collections.map((col) => (
                <ListGroup.Item key={col.name} className="d-flex justify-content-between align-items-center">
                  <code>{col.name}</code>
                  <Button size="sm" variant="outline-danger" onClick={() => void handleClearCollection(col.name)} disabled={clearingCollection === col.name}>
                    {clearingCollection === col.name ? <Spinner animation="border" size="sm" /> : 'Clear'}
                  </Button>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default SeedingTab;
