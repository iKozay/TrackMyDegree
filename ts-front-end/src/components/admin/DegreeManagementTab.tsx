import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Spinner, Tab, Table, Tabs } from 'react-bootstrap';
import { api } from '../../api/http-api-client';
import type { DegreeData } from '@shared/degree';

// ─── Degrees sub-tab ────────────────────────────────────────────────────────

const DegreesPanel: React.FC = () => {
  const [degrees, setDegrees] = useState<DegreeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<DegreeData[]>('/degree');
      setDegrees(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load degrees');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <div className="py-4 text-center"><Spinner animation="border" /></div>;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <span className="text-muted">{degrees.length} degree{degrees.length !== 1 ? 's' : ''}</span>
        <Button size="sm">+ Add Degree</Button>
      </div>
      <Table striped hover responsive>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Total Credits</th>
            <th>Pools</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {degrees.map((d) => (
            <tr key={d._id}>
              <td>{d.name}</td>
              <td>{d.degreeType ?? '—'}</td>
              <td>{d.totalCredits}</td>
              <td><Badge bg="secondary">{d.coursePools?.length ?? 0}</Badge></td>
              <td className="text-end">
                <Button size="sm" variant="outline-secondary" className="me-1">Edit</Button>
                <Button size="sm" variant="outline-danger">Delete</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
};

// ─── Main export ─────────────────────────────────────────────────────────────

const DegreeManagementTab: React.FC = () => (
  <div className="py-3">
    <Tabs defaultActiveKey="degrees" className="mb-3">
      <Tab eventKey="degrees" title="Degrees">
        <DegreesPanel />
      </Tab>
      <Tab eventKey="pools" title="Course Pools">
        <p className="text-muted py-3">Course pools panel coming soon.</p>
      </Tab>
      <Tab eventKey="courses" title="Courses">
        <p className="text-muted py-3">Courses panel coming soon.</p>
      </Tab>
    </Tabs>
  </div>
);

export default DegreeManagementTab;
