import React, { useCallback, useEffect, useState } from 'react';
import { Spinner, Alert, Button, Card, Col, Row } from 'react-bootstrap';
import { api } from '../../api/http-api-client';
import type { AdminStats, DbConnectionStatus } from '@shared/admin';
import type { UserDocument } from '@shared/user';

const MetricsTab: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [dbStatus, setDbStatus] = useState<DbConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, degreesRes, coursesRes, timelinesRes, dbRes] = await Promise.allSettled([
        api.get<UserDocument[]>('/users'),
        api.get<{ total?: number }>('/admin/collections/degrees/documents?limit=1'),
        api.get<{ total?: number }>('/admin/collections/courses/documents?limit=1'),
        api.get<{ total?: number }>('/admin/collections/timelines/documents?limit=1'),
        api.get<DbConnectionStatus>('/admin/connection-status'),
      ]);

      const users = usersRes.status === 'fulfilled' ? (usersRes.value as UserDocument[]) : [];
      const degreesData = degreesRes.status === 'fulfilled' ? (degreesRes.value as { total?: number }) : null;
      const coursesData = coursesRes.status === 'fulfilled' ? (coursesRes.value as { total?: number }) : null;
      const timelinesData = timelinesRes.status === 'fulfilled' ? (timelinesRes.value as { total?: number }) : null;

      if (dbRes.status === 'fulfilled') {
        setDbStatus(dbRes.value as DbConnectionStatus);
      }

      const byRole = { student: 0, admin: 0 };
      (users as UserDocument[]).forEach((u) => {
        if (u.type === 'student') byRole.student++;
        else if (u.type === 'admin') byRole.admin++;
      });

      setStats({
        totalUsers: users.length,
        totalTimelines: timelinesData?.total ?? 0,
        totalDegrees: degreesData?.total ?? 0,
        totalCourses: coursesData?.total ?? 0,
        usersByRole: byRole,
      });
      setLastRefreshed(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchMetrics(); }, [fetchMetrics]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger" className="mt-3">{error}</Alert>;
  }

  return (
    <div className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        {lastRefreshed && <small className="text-muted">Last refreshed: {lastRefreshed.toLocaleTimeString()}</small>}
        <Button size="sm" variant="outline-secondary" onClick={() => void fetchMetrics()} disabled={loading}>Refresh</Button>
      </div>
      {dbStatus && (
        <Alert variant={dbStatus.connected ? 'success' : 'danger'} className="mb-4">
          <strong>Database:</strong>{' '}
          {dbStatus.connected ? 'Connected' : 'Disconnected'}
          {dbStatus.message && ` — ${dbStatus.message}`}
        </Alert>
      )}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} md={3}>
          <Card className="h-100 text-center border-primary">
            <Card.Body>
              <div className="display-4 fw-bold text-primary">{stats?.usersByRole.student ?? 0}</div>
              <Card.Text className="text-muted">Number of Students</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card className="h-100 text-center border-success">
            <Card.Body>
              <div className="display-4 fw-bold text-success">{stats?.totalTimelines ?? 0}</div>
              <Card.Text className="text-muted">Total Timelines</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card className="h-100 text-center border-info">
            <Card.Body>
              <div className="display-4 fw-bold text-info">{stats?.totalDegrees ?? 0}</div>
              <Card.Text className="text-muted">Degrees</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card className="h-100 text-center border-warning">
            <Card.Body>
              <div className="display-4 fw-bold text-warning">{stats?.totalCourses ?? 0}</div>
              <Card.Text className="text-muted">Courses</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default MetricsTab;
