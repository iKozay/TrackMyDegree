import React, { useEffect, useState } from 'react';
import { Spinner, Alert } from 'react-bootstrap';
import { api } from '../../api/http-api-client';
import type { AdminStats, DbConnectionStatus } from '@shared/admin';
import type { UserDocument } from '@shared/user';

const MetricsTab: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [dbStatus, setDbStatus] = useState<DbConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
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

        const byRole = { student: 0, admin: 0, advisor: 0 };
        (users as UserDocument[]).forEach((u) => {
          if (u.role === 'student') byRole.student++;
          else if (u.role === 'admin') byRole.admin++;
          else if (u.role === 'advisor') byRole.advisor++;
        });

        setStats({
          totalUsers: users.length,
          totalTimelines: timelinesData?.total ?? 0,
          totalDegrees: degreesData?.total ?? 0,
          totalCourses: coursesData?.total ?? 0,
          usersByRole: byRole,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load metrics');
      } finally {
        setLoading(false);
      }
    };

    void fetchMetrics();
  }, []);

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
      <p className="text-muted">Loading complete.</p>
    </div>
  );
};

export default MetricsTab;
