import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Col, Form, Row, Spinner, Tab, Table, Tabs } from 'react-bootstrap';
import { api } from '../../api/http-api-client';
import type { DegreeData, CoursePoolData, CourseData } from '@trackmydegree/shared';

// ─── Degrees sub-tab ─────────────────────────────────────────────────────────

interface DegreesPanelProps {
  onManagePools: (degreeId: string) => void;
}

const DegreesPanel: React.FC<DegreesPanelProps> = ({ onManagePools }) => {
  const [degrees, setDegrees] = useState<DegreeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.get<DegreeData[]>('/degree');
        setDegrees(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load degrees');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) return <div className="py-4 text-center"><Spinner animation="border" /></div>;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <>
      <p className="text-muted mb-3">{degrees.length} degree{degrees.length !== 1 ? 's' : ''}</p>
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
          {degrees.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center text-muted py-4">
                No degrees found. Use the Seed Database tab to import data.
              </td>
            </tr>
          )}
          {degrees.map((d) => (
            <tr key={d._id}>
              <td>{d.name}</td>
              <td>{d.degreeType ?? '—'}</td>
              <td>{d.totalCredits}</td>
              <td><Badge bg="secondary">{d.coursePools?.length ?? 0}</Badge></td>
              <td className="text-end">
                <Button size="sm" variant="outline-primary" onClick={() => onManagePools(d._id)}>
                  View Pools
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
};

// ─── Course Pools sub-tab ─────────────────────────────────────────────────────

interface CoursePoolsPanelProps {
  initialDegreeId?: string;
}

const CoursePoolsPanel: React.FC<CoursePoolsPanelProps> = ({ initialDegreeId }) => {
  const [degrees, setDegrees] = useState<DegreeData[]>([]);
  const [selectedDegreeId, setSelectedDegreeId] = useState<string>(initialDegreeId ?? '');
  const [pools, setPools] = useState<CoursePoolData[]>([]);
  const [loadingDegrees, setLoadingDegrees] = useState(true);
  const [loadingPools, setLoadingPools] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDegrees = async () => {
      setLoadingDegrees(true);
      try {
        const data = await api.get<DegreeData[]>('/degree');
        const list = Array.isArray(data) ? data : [];
        setDegrees(list);
        if (!initialDegreeId && list.length > 0) setSelectedDegreeId(list[0]._id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load degrees');
      } finally {
        setLoadingDegrees(false);
      }
    };
    void fetchDegrees();
  }, [initialDegreeId]);

  useEffect(() => {
    if (initialDegreeId) setSelectedDegreeId(initialDegreeId);
  }, [initialDegreeId]);

  const loadPools = useCallback(async (degreeId: string) => {
    if (!degreeId) return;
    setLoadingPools(true);
    setError(null);
    try {
      const data = await api.get<CoursePoolData[]>(
        `/degree/${encodeURIComponent(degreeId)}/coursepools`,
      );
      setPools(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pools');
    } finally {
      setLoadingPools(false);
    }
  }, []);

  useEffect(() => { if (selectedDegreeId) void loadPools(selectedDegreeId); }, [selectedDegreeId, loadPools]);

  if (loadingDegrees) return <div className="py-4 text-center"><Spinner animation="border" /></div>;

  return (
    <>
      <Row className="mb-3 align-items-center">
        <Col xs="auto">
          <Form.Select
            value={selectedDegreeId}
            onChange={(e) => setSelectedDegreeId(e.target.value)}
            style={{ minWidth: 220 }}
          >
            {degrees.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </Form.Select>
        </Col>
      </Row>
      {error && <Alert variant="danger">{error}</Alert>}
      {loadingPools ? (
        <div className="py-4 text-center"><Spinner animation="border" /></div>
      ) : (
        <Table striped hover responsive>
          <thead>
            <tr><th>Name</th><th>Credits Required</th><th>Courses</th></tr>
          </thead>
          <tbody>
            {pools.map((p) => (
              <tr key={p._id}>
                <td>{p.name}</td>
                <td>{p.creditsRequired}</td>
                <td><Badge bg="secondary">{p.courses.length}</Badge></td>
              </tr>
            ))}
            {pools.length === 0 && (
              <tr><td colSpan={3} className="text-center text-muted py-4">No pools found</td></tr>
            )}
          </tbody>
        </Table>
      )}
    </>
  );
};

// ─── Courses sub-tab ─────────────────────────────────────────────────────────

const CoursesPanel: React.FC = () => {
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search && { search }),
      });
      const data = await api.get<CourseData[]>(`/courses?${params.toString()}`);
      setCourses(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { void load(); }, [load]);

  const hasMore = courses.length === limit;

  return (
    <>
      <Row className="mb-3">
        <Col>
          <Form.Control
            placeholder="Search courses…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </Col>
      </Row>
      {error && <Alert variant="danger">{error}</Alert>}
      {loading ? (
        <div className="py-4 text-center"><Spinner animation="border" /></div>
      ) : (
        <>
          <Table striped hover responsive>
            <thead>
              <tr>
                <th>Code</th>
                <th>Title</th>
                <th className="text-center">Credits</th>
                <th className="text-center">Offered In</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c._id}>
                  <td><code>{c._id}</code></td>
                  <td>{c.title}</td>
                  <td className="text-center">{c.credits}</td>
                  <td className="text-center">{(c.offeredIn ?? []).join(', ') || '—'}</td>
                </tr>
              ))}
              {courses.length === 0 && (
                <tr><td colSpan={4} className="text-center text-muted py-4">No courses found</td></tr>
              )}
            </tbody>
          </Table>
          <div className="d-flex justify-content-between align-items-center">
            <span className="text-muted small">Page {page}</span>
            <div>
              <Button size="sm" variant="outline-secondary" className="me-1" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>‹ Prev</Button>
              <Button size="sm" variant="outline-secondary" disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>Next ›</Button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

// ─── Main export ─────────────────────────────────────────────────────────────

const DegreeManagementTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState('degrees');
  const [managingPoolsForDegree, setManagingPoolsForDegree] = useState<string | undefined>(undefined);

  const handleManagePools = (degreeId: string) => {
    setManagingPoolsForDegree(degreeId);
    setActiveSubTab('pools');
  };

  return (
    <div className="py-3">
      <Tabs
        activeKey={activeSubTab}
        onSelect={(k) => setActiveSubTab(k ?? 'degrees')}
        id="degree-management-tabs"
        className="mb-3"
        mountOnEnter
      >
        <Tab eventKey="degrees" title="Degrees">
          <DegreesPanel onManagePools={handleManagePools} />
        </Tab>
        <Tab eventKey="pools" title="Course Pools">
          <CoursePoolsPanel initialDegreeId={managingPoolsForDegree} />
        </Tab>
        <Tab eventKey="courses" title="Courses">
          <CoursesPanel />
        </Tab>
      </Tabs>
    </div>
  );
};

export default DegreeManagementTab;
