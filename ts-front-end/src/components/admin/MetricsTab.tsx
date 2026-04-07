import React, { useCallback, useEffect, useState } from 'react';
import { Spinner, Alert, Button, Card, Col, OverlayTrigger, Row, Tooltip } from 'react-bootstrap';
import { api } from '../../api/http-api-client';
import type { ApiResponse } from '../../types/response.types';
import type { AdminStats, DbConnectionStatus } from '@trackmydegree/shared';

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
      const [usersRes, studentsRes, adminsRes, degreesRes, coursesRes, timelinesRes, dbRes] = await Promise.allSettled([
        api.get<ApiResponse<{ count: number }>>('/admin/collections/users/documents-count'),
        api.get<ApiResponse<{ count: number }>>('/admin/collections/users/documents-count?field=type&value=student'),
        api.get<ApiResponse<{ count: number }>>('/admin/collections/users/documents-count?field=type&value=admin'),
        api.get<ApiResponse<{ count: number }>>('/admin/collections/degrees/documents-count'),
        api.get<ApiResponse<{ count: number }>>('/admin/collections/courses/documents-count'),
        api.get<ApiResponse<{ count: number }>>('/admin/collections/timelines/documents-count'),
        api.get<DbConnectionStatus>('/admin/connection-status'),
      ]);

      const users = usersRes.status === 'fulfilled' ? (usersRes.value.data ?? { count: 0 }) : { count: 0 };
      const students = studentsRes.status === 'fulfilled' ? (studentsRes.value.data ?? { count: 0 }) : { count: 0 };
      const admins = adminsRes.status === 'fulfilled' ? (adminsRes.value.data ?? { count: 0 }) : { count: 0 };
      const degrees = degreesRes.status === 'fulfilled' ? (degreesRes.value.data ?? { count: 0 }) : { count: 0 };
      const courses = coursesRes.status === 'fulfilled' ? (coursesRes.value.data ?? { count: 0 }) : { count: 0 };
      const timelines = timelinesRes.status === 'fulfilled' ? (timelinesRes.value.data ?? { count: 0 }) : { count: 0 };

      if (dbRes.status === 'fulfilled') {
        setDbStatus(dbRes.value as DbConnectionStatus);
      }

      const byRole = { student: students.count, admin: admins.count };

      setStats({
        totalUsers: users.count,
        totalTimelines: timelines.count,
        totalDegrees: degrees.count,
        totalCourses: courses.count,
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
          <OverlayTrigger placement="top" overlay={<Tooltip>Total number of registered student accounts in the system</Tooltip>}>
            <Card className="h-100 text-center border-primary" style={{ cursor: 'default' }}>
              <Card.Body>
                <div className="display-4 fw-bold text-primary">{stats?.usersByRole.student ?? 0}</div>
                <Card.Text className="text-muted">Number of Students</Card.Text>
              </Card.Body>
            </Card>
          </OverlayTrigger>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <OverlayTrigger placement="top" overlay={<Tooltip>Total number of degree timelines created by students</Tooltip>}>
            <Card className="h-100 text-center border-success" style={{ cursor: 'default' }}>
              <Card.Body>
                <div className="display-4 fw-bold text-success">{stats?.totalTimelines ?? 0}</div>
                <Card.Text className="text-muted">Total Timelines</Card.Text>
              </Card.Body>
            </Card>
          </OverlayTrigger>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <OverlayTrigger placement="top" overlay={<Tooltip>Total number of degree programs available in the system</Tooltip>}>
            <Card className="h-100 text-center border-info" style={{ cursor: 'default' }}>
              <Card.Body>
                <div className="display-4 fw-bold text-info">{stats?.totalDegrees ?? 0}</div>
                <Card.Text className="text-muted">Degrees</Card.Text>
              </Card.Body>
            </Card>
          </OverlayTrigger>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <OverlayTrigger placement="top" overlay={<Tooltip>Total number of courses available across all degree programs</Tooltip>}>
            <Card className="h-100 text-center border-warning" style={{ cursor: 'default' }}>
              <Card.Body>
                <div className="display-4 fw-bold text-warning">{stats?.totalCourses ?? 0}</div>
                <Card.Text className="text-muted">Courses</Card.Text>
              </Card.Body>
            </Card>
          </OverlayTrigger>
        </Col>
      </Row>
    </div>
  );
};

export default MetricsTab;
