import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import { api } from '../../api/http-api-client';
import type { UserDocument, UserRole, CreateUserInput, UpdateUserInput } from '@shared/user';

const ROLES: UserRole[] = ['student', 'advisor', 'admin'];

// ─── Create / Edit modal ─────────────────────────────────────────────────────

interface UserModalProps {
  show: boolean;
  onHide: () => void;
  onSaved: () => void;
  editing: UserDocument | null;
}

const UserModal: React.FC<UserModalProps> = ({ show, onHide, onSaved, editing }) => {
  const isEdit = editing !== null;
  const [form, setForm] = useState<CreateUserInput>({ email: '', name: '', password: '', role: 'student' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editing) { setForm({ email: editing.email, name: editing.name, password: '', role: editing.role }); }
    else { setForm({ email: '', name: '', password: '', role: 'student' }); }
    setError(null);
  }, [editing, show]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        const payload: UpdateUserInput = { email: form.email, name: form.name, role: form.role };
        await api.put(`/users/${editing!._id}`, payload);
      } else {
        await api.post<UserDocument>('/users', form);
      }
      onSaved();
      onHide();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton><Modal.Title>{isEdit ? 'Edit User' : 'Create User'}</Modal.Title></Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Name</Form.Label>
            <Form.Control value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </Form.Group>
          {!isEdit && (
            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </Form.Group>
          )}
          <Form.Group className="mb-3">
            <Form.Label>Role</Form.Label>
            <Form.Select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}>
              {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </Form.Select>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cancel</Button>
        <Button onClick={() => void handleSave()} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
      </Modal.Footer>
    </Modal>
  );
};

const roleBadgeVariant = (role: UserRole) => {
  if (role === 'admin') return 'danger';
  if (role === 'advisor') return 'info';
  return 'secondary';
};

const UserManagementTab: React.FC = () => {
  const [users, setUsers] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<UserDocument[]>('/users');
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = users.filter((u) => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesSearch;
  });

  if (loading) return <div className="py-4 text-center"><Spinner animation="border" /></div>;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <div className="py-3">
      <Row className="mb-3 align-items-center g-2">
        <Col>
          <Form.Control placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </Col>
        <Col xs="auto">
          <Form.Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}>
            <option value="all">All roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </Form.Select>
        </Col>
        <Col xs="auto">
          <Button size="sm">+ Create User</Button>
        </Col>
      </Row>
      <Table striped hover responsive>
        <thead>
          <tr><th>Name</th><th>Email</th><th>Role</th><th>Created</th><th></th></tr>
        </thead>
        <tbody>
          {filtered.map((u) => (
            <tr key={u._id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td><Badge bg={roleBadgeVariant(u.role)}>{u.role}</Badge></td>
              <td className="text-muted small">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
              <td></td>
            </tr>
          ))}
          {filtered.length === 0 && <tr><td colSpan={5} className="text-center text-muted py-4">No users found</td></tr>}
        </tbody>
      </Table>
    </div>
  );
};

export default UserManagementTab;
