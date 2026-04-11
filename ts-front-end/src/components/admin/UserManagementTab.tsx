import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import { api } from '../../api/http-api-client';
import type { ApiResponse } from '../../types/response.types';
import type { UserDocument, UserRole, CreateUserInput, UpdateUserInput } from '@trackmydegree/shared';

const ROLES: UserRole[] = ['student', 'admin'];

// ─── Invite Admin modal ───────────────────────────────────────────────────────

interface InviteAdminModalProps {
  show: boolean;
  onHide: () => void;
  onSaved: () => void;
}

const InviteAdminModal: React.FC<InviteAdminModalProps> = ({ show, onHide, onSaved }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (show) { setEmail(''); setName(''); setError(null); } }, [show]);

  const handleInvite = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.post('/users/invite-admin', { email, name });
      onSaved();
      onHide();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invite failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton><Modal.Title>Invite Admin User</Modal.Title></Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        <p className="text-muted small">An invitation email will be sent with a link to set their password.</p>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Name</Form.Label>
            <Form.Control value={name} onChange={(e) => setName(e.target.value)} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cancel</Button>
        <Button variant="warning" onClick={() => void handleInvite()} disabled={saving || !email || !name}>
          {saving ? 'Sending…' : 'Send Invite'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

// ─── Create / Edit modal ──────────────────────────────────────────────────────

interface UserModalProps {
  show: boolean;
  onHide: () => void;
  onSaved: () => void;
  editing: UserDocument | null;
}

const UserModal: React.FC<UserModalProps> = ({ show, onHide, onSaved, editing }) => {
  const isEdit = editing !== null;
  const [form, setForm] = useState<CreateUserInput>({ email: '', fullname: '', password: '', type: 'student' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editing) { setForm({ email: editing.email, fullname: editing.fullname, password: '', type: editing.type }); }
    else { setForm({ email: '', fullname: '', password: '', type: 'student' }); }
    setError(null);
  }, [editing, show]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        const payload: UpdateUserInput = { email: form.email, fullname: form.fullname, type: form.type };
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
            <Form.Label>Full Name</Form.Label>
            <Form.Control value={form.fullname} onChange={(e) => setForm((f) => ({ ...f, fullname: e.target.value }))} />
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
            <Form.Select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as UserRole }))}>
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

const roleBadgeVariant = (type: UserRole) => {
  if (type === 'admin') return 'danger';
  return 'secondary';
};

const UserManagementTab: React.FC = () => {
  const [users, setUsers] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDocument | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<ApiResponse<UserDocument[]>>('/admin/collections/users/documents');
      setUsers(result.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleDelete = async (user: UserDocument) => {
    if (!window.confirm(`Delete user "${user.fullname}" (${user.email})?`)) return;
    try { await api.delete(`/users/${user._id}`); await load(); }
    catch (err) { alert(err instanceof Error ? err.message : 'Delete failed'); }
  };

  const filtered = users.filter((u) => {
    const matchesRole = roleFilter === 'all' || u.type === roleFilter;
    const matchesSearch = !search || u.fullname.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesSearch;
  });

  if (loading) return <div className="py-4 text-center"><Spinner animation="border" /></div>;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <div className="py-3">
      <p className="text-muted mb-3">{filtered.length} of {users.length} user{users.length !== 1 ? 's' : ''}</p>
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
          <Button size="sm" variant="warning" className="me-2" onClick={() => setShowInviteModal(true)}>Invite Admin</Button>
          <Button size="sm" onClick={() => { setEditingUser(null); setShowUserModal(true); }}>+ Create User</Button>
        </Col>
      </Row>
      <Table striped hover responsive>
        <thead>
          <tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr>
        </thead>
        <tbody>
          {filtered.map((u) => (
            <tr key={u._id}>
              <td>{u.fullname}</td>
              <td>{u.email}</td>
              <td><Badge bg={roleBadgeVariant(u.type)}>{u.type}</Badge></td>
              <td className="text-end">
                <Button size="sm" variant="outline-secondary" className="me-1" onClick={() => { setEditingUser(u); setShowUserModal(true); }}>Edit</Button>
                <Button size="sm" variant="outline-danger" onClick={() => void handleDelete(u)}>Delete</Button>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && <tr><td colSpan={4} className="text-center text-muted py-4">No users found</td></tr>}
        </tbody>
      </Table>
      <UserModal show={showUserModal} onHide={() => setShowUserModal(false)} onSaved={() => void load()} editing={editingUser} />
      <InviteAdminModal show={showInviteModal} onHide={() => setShowInviteModal(false)} onSaved={() => void load()} />
    </div>
  );
};

export default UserManagementTab;
