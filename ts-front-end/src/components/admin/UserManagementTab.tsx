import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Spinner, Table } from 'react-bootstrap';
import { api } from '../../api/http-api-client';
import type { UserDocument, UserRole } from '@shared/user';

const roleBadgeVariant = (role: UserRole) => {
  if (role === 'admin') return 'danger';
  if (role === 'advisor') return 'info';
  return 'secondary';
};

const UserManagementTab: React.FC = () => {
  const [users, setUsers] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) return <div className="py-4 text-center"><Spinner animation="border" /></div>;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <div className="py-3">
      <Table striped hover responsive>
        <thead>
          <tr><th>Name</th><th>Email</th><th>Role</th><th>Created</th><th></th></tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u._id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td><Badge bg={roleBadgeVariant(u.role)}>{u.role}</Badge></td>
              <td className="text-muted small">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
              <td></td>
            </tr>
          ))}
          {users.length === 0 && <tr><td colSpan={5} className="text-center text-muted py-4">No users found</td></tr>}
        </tbody>
      </Table>
    </div>
  );
};

export default UserManagementTab;
