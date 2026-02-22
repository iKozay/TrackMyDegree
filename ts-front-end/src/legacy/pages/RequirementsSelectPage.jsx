import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import staticPrograms from '../data/requirementsPrograms';
import { useAuth } from '../../hooks/useAuth';

const API_SERVER = import.meta.env.VITE_API_SERVER || 'http://localhost:8000/api';

export default function RequirementsSelectPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [programs, setPrograms] = useState(staticPrograms);
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const response = await fetch(`${API_SERVER}/credit-forms`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          if (data.forms && data.forms.length > 0) {
            // Normalize: API returns programId, static data uses id
            const normalized = data.forms.map((f) => ({
              ...f,
              id: f.id || f.programId,
            }));
            setPrograms(normalized);
          }
        }
      } catch (error) {
        console.error('Error fetching credit forms:', error);
        // Fall back to static programs
      } finally {
        setLoading(false);
      }
    };

    fetchForms();
  }, []);

  return (
    <div className="container py-4">
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 className="mb-2" style={{ margin: 0 }}>
            Missing Requirements
          </h2>
          {isAdmin && (
            <Link
              to="/admin/credit-forms"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                borderRadius: 8,
                fontWeight: 600,
                border: '2px solid #7a0019',
                background: '#7a0019',
                color: '#fff',
                textDecoration: 'none',
                fontSize: '14px',
              }}
            >
              ⚙️ Manage Forms
            </Link>
          )}
        </div>
        <p
          className="text-muted"
          style={{
            margin: '6px 0 24px 0',
            maxWidth: 520,
            fontSize: 16,
            lineHeight: 1.5
          }}
        >
          Select your program to view and fill out the credit count form.
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>Loading forms...</p>
          </div>
        ) : (
          /* Inline CSS Grid (immune to global .row/.col/.card overrides) */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 16,
              alignItems: 'stretch',
            }}
          >
            {programs.map((p) => (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/requirements/${p.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    navigate(`/requirements/${p.id}`);
                  }
                }}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  padding: 16,
                  background: '#fff',
                  boxShadow: '0 1px 4px rgba(0,0,0,.06)',
                  cursor: 'pointer',
                  transition: 'transform .08s ease, box-shadow .08s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 14px rgba(0,0,0,.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.06)';
                }}
              >
                <h5
                  style={{
                    margin: '0 0 4px',
                    fontSize: 18,
                    overflowWrap: 'anywhere',
                    whiteSpace: 'normal',
                  }}
                >
                  {p.title}
                </h5>
                <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>{p.subtitle}</p>
              </div>
            ))}
          </div>
        )}

        <div className="card mt-4">
          <div className="card-body">
            <h6 className="mb-2">About Credit Count Forms</h6>
            <p className="mb-0 text-muted" style={{ fontSize: 14 }}>
              Use these forms to manually track your progress. You can clear, download/print, and later save once signed
              in.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
