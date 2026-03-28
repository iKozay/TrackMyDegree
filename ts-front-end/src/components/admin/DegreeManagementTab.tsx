import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Badge, Button, Col, Form, Modal, Row, Spinner, Tab, Table, Tabs } from 'react-bootstrap';
import { api } from '../../api/http-api-client';
import type { DegreeData, CoursePoolInfo, CreateDegreeInput, UpdateDegreeInput, CreateCoursePoolInput } from '@shared/degree';
import type { CourseDocument } from '@shared/course';

// ─── Degrees sub-tab ─────────────────────────────────────────────────────────

interface DegreesPanelProps {
  onManagePools: (degreeId: string) => void;
}

const DegreesPanel: React.FC<DegreesPanelProps> = ({ onManagePools }) => {
  const [degrees, setDegrees] = useState<DegreeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<DegreeData | null>(null);
  const [form, setForm] = useState<CreateDegreeInput>({ name: '', totalCredits: 0 });
  const [saving, setSaving] = useState(false);

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

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', totalCredits: 0 });
    setShowModal(true);
  };

  const openEdit = (degree: DegreeData) => {
    setEditing(degree);
    setForm({ name: degree.name, totalCredits: degree.totalCredits, degreeType: degree.degreeType });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await api.put<DegreeData>(`/degree/${editing._id}`, form as UpdateDegreeInput);
      } else {
        await api.post<DegreeData>('/degree', form);
      }
      setShowModal(false);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this degree?')) return;
    try {
      await api.delete(`/degree/${id}`);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  if (loading) return <div className="py-4 text-center"><Spinner animation="border" /></div>;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <span className="text-muted">{degrees.length} degree{degrees.length !== 1 ? 's' : ''}</span>
        <Button size="sm" onClick={openCreate}>+ Add Degree</Button>
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
          {degrees.length === 0 && (
            <tr><td colSpan={5} className="text-center text-muted py-4">No degrees found. Use the Seed Database tab to import data.</td></tr>
          )}
          {degrees.map((d) => (
            <tr key={d._id}>
              <td>{d.name}</td>
              <td>{d.degreeType ?? '—'}</td>
              <td>{d.totalCredits}</td>
              <td><Badge bg="secondary">{d.coursePools?.length ?? 0}</Badge></td>
              <td className="text-end">
                <Button size="sm" variant="outline-primary" className="me-1" onClick={() => onManagePools(d._id)}>Manage Pools</Button>
                <Button size="sm" variant="outline-secondary" className="me-1" onClick={() => openEdit(d)}>Edit</Button>
                <Button size="sm" variant="outline-danger" onClick={() => void handleDelete(d._id)}>Delete</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editing ? 'Edit Degree' : 'Add Degree'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Total Credits</Form.Label>
              <Form.Control type="number" value={form.totalCredits} onChange={(e) => setForm((f) => ({ ...f, totalCredits: Number(e.target.value) }))} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Degree Type</Form.Label>
              <Form.Control value={form.degreeType ?? ''} onChange={(e) => setForm((f) => ({ ...f, degreeType: e.target.value }))} placeholder="e.g. BEng, BSc" />
            </Form.Group>
          </Form>
          {editing && (
            <p className="text-muted small mt-2 mb-0">
              To add or remove course pools for this degree, click <strong>Manage Pools</strong> in the table.
            </p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={() => void handleSave()} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

// ─── Course search hook ───────────────────────────────────────────────────────

function useCourseSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CourseDocument[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await api.get<CourseDocument[]>(`/courses?search=${encodeURIComponent(query)}&limit=10`);
        const list = Array.isArray(data) ? data : [];
        setResults(list.map((c) => ({ ...c, code: c.code ?? c._id })));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  return { query, setQuery, results, searching };
}

// ─── Course Pools sub-tab ─────────────────────────────────────────────────────

interface CoursePoolsPanelProps {
  initialDegreeId?: string;
}

const CoursePoolsPanel: React.FC<CoursePoolsPanelProps> = ({ initialDegreeId }) => {
  const [degrees, setDegrees] = useState<DegreeData[]>([]);
  const [selectedDegreeId, setSelectedDegreeId] = useState<string>(initialDegreeId ?? '');
  const [pools, setPools] = useState<CoursePoolInfo[]>([]);
  const [loadingDegrees, setLoadingDegrees] = useState(true);
  const [loadingPools, setLoadingPools] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CoursePoolInfo | null>(null);
  const [form, setForm] = useState<Omit<CreateCoursePoolInput, 'degreeId'>>({ name: '', creditsRequired: 0, courses: [] });
  const [saving, setSaving] = useState(false);
  const courseSearch = useCourseSearch();

  useEffect(() => {
    const fetchDegrees = async () => {
      setLoadingDegrees(true);
      try {
        const data = await api.get<DegreeData[]>('/degree');
        setDegrees(data);
        if (!initialDegreeId && data.length > 0) setSelectedDegreeId(data[0]._id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load degrees');
      } finally {
        setLoadingDegrees(false);
      }
    };
    void fetchDegrees();
  }, [initialDegreeId]);

  // Sync initialDegreeId prop when it changes (e.g. navigated from Degrees tab)
  useEffect(() => {
    if (initialDegreeId) setSelectedDegreeId(initialDegreeId);
  }, [initialDegreeId]);

  const loadPools = useCallback(async (degreeId: string) => {
    if (!degreeId) return;
    setLoadingPools(true);
    setError(null);
    try {
      const data = await api.get<CoursePoolInfo[]>(`/degree/${degreeId}/coursepools`);
      setPools(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pools');
    } finally {
      setLoadingPools(false);
    }
  }, []);

  useEffect(() => { if (selectedDegreeId) void loadPools(selectedDegreeId); }, [selectedDegreeId, loadPools]);

  const openCreate = () => { setEditing(null); setForm({ name: '', creditsRequired: 0, courses: [] }); courseSearch.setQuery(''); setShowModal(true); };
  const openEdit = (pool: CoursePoolInfo) => { setEditing(pool); setForm({ name: pool.name, creditsRequired: pool.creditsRequired, courses: [...pool.courses] }); courseSearch.setQuery(''); setShowModal(true); };

  const addCourse = (code: string) => {
    if (!form.courses.includes(code)) {
      setForm((f) => ({ ...f, courses: [...f.courses, code] }));
    }
    courseSearch.setQuery('');
  };

  const removeCourse = (code: string) => {
    setForm((f) => ({ ...f, courses: f.courses.filter((c) => c !== code) }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) { await api.put(`/coursepool/${editing._id}`, form); }
      else { await api.post('/coursepool', { ...form, degreeId: selectedDegreeId }); }
      setShowModal(false);
      await loadPools(selectedDegreeId);
    } catch (err) { alert(err instanceof Error ? err.message : 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this pool?')) return;
    try { await api.delete(`/coursepool/${id}`); await loadPools(selectedDegreeId); }
    catch (err) { alert(err instanceof Error ? err.message : 'Delete failed'); }
  };

  if (loadingDegrees) return <div className="py-4 text-center"><Spinner animation="border" /></div>;

  return (
    <>
      <Row className="mb-3 align-items-center">
        <Col xs="auto">
          <Form.Select value={selectedDegreeId} onChange={(e) => setSelectedDegreeId(e.target.value)} style={{ minWidth: 220 }}>
            {degrees.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </Form.Select>
        </Col>
        <Col className="text-end">
          <Button size="sm" onClick={openCreate} disabled={!selectedDegreeId}>+ Add Pool</Button>
        </Col>
      </Row>
      {error && <Alert variant="danger">{error}</Alert>}
      {loadingPools ? <div className="py-4 text-center"><Spinner animation="border" /></div> : (
        <Table striped hover responsive>
          <thead><tr><th>Name</th><th>Credits Required</th><th>Courses</th><th></th></tr></thead>
          <tbody>
            {pools.map((p) => (
              <tr key={p._id}>
                <td>{p.name}</td>
                <td>{p.creditsRequired}</td>
                <td><Badge bg="secondary">{p.courses.length}</Badge></td>
                <td className="text-end">
                  <Button size="sm" variant="outline-secondary" className="me-1" onClick={() => openEdit(p)}>Edit</Button>
                  <Button size="sm" variant="outline-danger" onClick={() => void handleDelete(p._id)}>Delete</Button>
                </td>
              </tr>
            ))}
            {pools.length === 0 && <tr><td colSpan={4} className="text-center text-muted py-4">No pools found</td></tr>}
          </tbody>
        </Table>
      )}

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton><Modal.Title>{editing ? 'Edit Pool' : 'Add Pool'}</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Credits Required</Form.Label>
              <Form.Control type="number" value={form.creditsRequired} onChange={(e) => setForm((f) => ({ ...f, creditsRequired: Number(e.target.value) }))} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Courses</Form.Label>
              <div className="mb-2 d-flex flex-wrap gap-1">
                {form.courses.map((code) => (
                  <Badge key={code} bg="secondary" className="d-flex align-items-center gap-1" style={{ fontSize: '0.85em' }}>
                    {code}
                    <span role="button" style={{ cursor: 'pointer' }} onClick={() => removeCourse(code)}>&times;</span>
                  </Badge>
                ))}
                {form.courses.length === 0 && <span className="text-muted small">No courses added yet</span>}
              </div>
              <Form.Control
                placeholder="Search course code or title…"
                value={courseSearch.query}
                onChange={(e) => courseSearch.setQuery(e.target.value)}
              />
              {courseSearch.searching && <small className="text-muted">Searching…</small>}
              {courseSearch.results.length > 0 && (
                <div className="border rounded mt-1" style={{ maxHeight: 180, overflowY: 'auto' }}>
                  {courseSearch.results.map((c) => {
                    const code = c.code ?? c._id;
                    return (
                      <div
                        key={code}
                        className="px-3 py-2 d-flex justify-content-between align-items-center"
                        style={{ cursor: 'pointer', borderBottom: '1px solid #eee' }}
                        onClick={() => addCourse(code)}
                      >
                        <span><code>{code}</code> — {c.title}</span>
                        <Badge bg={form.courses.includes(code) ? 'success' : 'outline-secondary'}>
                          {form.courses.includes(code) ? 'Added' : '+ Add'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={() => void handleSave()} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

// ─── Courses sub-tab ─────────────────────────────────────────────────────────

const CoursesPanel: React.FC = () => {
  const [courses, setCourses] = useState<CourseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), ...(search && { search }) });
      const data = await api.get<CourseDocument[]>(`/courses?${params.toString()}`);
      // Backend returns an array directly
      const list = Array.isArray(data) ? data : [];
      setCourses(list.map((c) => ({ ...c, code: c.code ?? c._id })));
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
      <Row className="mb-3 align-items-center">
        <Col>
          <Form.Control placeholder="Search courses…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </Col>
      </Row>
      {error && <Alert variant="danger">{error}</Alert>}
      {loading ? <div className="py-4 text-center"><Spinner animation="border" /></div> : (
        <>
          <Table striped hover responsive>
            <thead><tr><th>Code</th><th>Title</th><th className="text-center">Credits</th><th className="text-center">Offered In</th></tr></thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.code ?? c._id}>
                  <td><code>{c.code ?? c._id}</code></td>
                  <td>{c.title}</td>
                  <td className="text-center">{c.credits}</td>
                  <td className="text-center">{(c.offeredIn ?? []).join(', ') || '—'}</td>
                </tr>
              ))}
              {courses.length === 0 && <tr><td colSpan={4} className="text-center text-muted py-4">No courses found</td></tr>}
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
