import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Col, Form, Modal, Row, Spinner, Tab, Table, Tabs } from 'react-bootstrap';
import { api } from '../../api/http-api-client';
import type { DegreeData, CoursePoolInfo, CreateDegreeInput, UpdateDegreeInput, CreateCoursePoolInput } from '@shared/degree';

// ─── Degrees sub-tab ────────────────────────────────────────────────────────

const DegreesPanel: React.FC = () => {
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
          {degrees.map((d) => (
            <tr key={d._id}>
              <td>{d.name}</td>
              <td>{d.degreeType ?? '—'}</td>
              <td>{d.totalCredits}</td>
              <td><Badge bg="secondary">{d.coursePools?.length ?? 0}</Badge></td>
              <td className="text-end">
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
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={() => void handleSave()} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

// ─── Course Pools sub-tab ────────────────────────────────────────────────────

const CoursePoolsPanel: React.FC = () => {
  const [degrees, setDegrees] = useState<DegreeData[]>([]);
  const [selectedDegreeId, setSelectedDegreeId] = useState<string>('');
  const [pools, setPools] = useState<CoursePoolInfo[]>([]);
  const [loadingDegrees, setLoadingDegrees] = useState(true);
  const [loadingPools, setLoadingPools] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CoursePoolInfo | null>(null);
  const [form, setForm] = useState<Omit<CreateCoursePoolInput, 'degreeId'>>({ name: '', creditsRequired: 0, courses: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchDegrees = async () => {
      setLoadingDegrees(true);
      try {
        const data = await api.get<DegreeData[]>('/degree');
        setDegrees(data);
        if (data.length > 0) setSelectedDegreeId(data[0]._id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load degrees');
      } finally {
        setLoadingDegrees(false);
      }
    };
    void fetchDegrees();
  }, []);

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

  const openCreate = () => { setEditing(null); setForm({ name: '', creditsRequired: 0, courses: [] }); setShowModal(true); };
  const openEdit = (pool: CoursePoolInfo) => { setEditing(pool); setForm({ name: pool.name, creditsRequired: pool.creditsRequired, courses: pool.courses }); setShowModal(true); };

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
      <Modal show={showModal} onHide={() => setShowModal(false)}>
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

// ─── Main export ─────────────────────────────────────────────────────────────

const DegreeManagementTab: React.FC = () => (
  <div className="py-3">
    <Tabs defaultActiveKey="degrees" className="mb-3">
      <Tab eventKey="degrees" title="Degrees">
        <DegreesPanel />
      </Tab>
      <Tab eventKey="pools" title="Course Pools">
        <CoursePoolsPanel />
      </Tab>
      <Tab eventKey="courses" title="Courses">
        <p className="text-muted py-3">Courses panel coming soon.</p>
      </Tab>
    </Tabs>
  </div>
);

export default DegreeManagementTab;
