import React from 'react';
import { useNavigate } from 'react-router-dom';
import programs from '../data/requirementsPrograms';

export default function RequirementsSelectPage() {
  const navigate = useNavigate();

  return (
    <div className="container py-4">
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h2 className="mb-2" style={{ margin: 0 }}>Missing Requirements</h2>
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

        {/* Inline CSS Grid (immune to global .row/.col/.card overrides) */}
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
              onClick={() => navigate(`/requirements/${p.id}`)}
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
              <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
                {p.subtitle}
              </p>
            </div>
          ))}
        </div>

        <div className="card mt-4">
          <div className="card-body">
            <h6 className="mb-2">About Credit Count Forms</h6>
            <p className="mb-0 text-muted" style={{ fontSize: 14 }}>
              Use these forms to manually track your progress. You can clear, download/print,
              and later save once signed in.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
