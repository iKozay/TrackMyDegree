import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Form, Modal, Spinner, Tab, Table, Tabs } from 'react-bootstrap';
import { api } from '../../api/http-api-client';
import type { DegreeData, CreateDegreeInput, UpdateDegreeInput } from '@shared/degree';

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
