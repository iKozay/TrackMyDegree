import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import staticPrograms from '../data/requirementsPrograms';

const API_SERVER = import.meta.env.VITE_API_SERVER || 'http://localhost:8000/api';
const BURGUNDY = '#7a0019';

// Reusable button
function ActionButton({ children, onClick, variant = 'outline' }) {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    borderRadius: 12,
    fontWeight: 600,
    border: `2px solid ${BURGUNDY}`,
    transition: 'transform .08s ease, box-shadow .08s ease, background .08s ease, color .08s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,.06)',
    cursor: 'pointer',
    userSelect: 'none',
  };

  const outline = {
    background: '#fff',
    color: '#111',
  };

  const solid = {
    background: BURGUNDY,
    color: '#fff',
  };

  const style = { ...base, ...(variant === 'solid' ? solid : outline) };

  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
    >
      {children}
    </button>
  );
}

import PropTypes from 'prop-types';

ActionButton.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  variant: PropTypes.oneOf(['outline', 'solid']),
};

export default function RequirementsFormPage() {
  const { programId } = useParams();
  const navigate = useNavigate();
  const iframeRef = useRef(null);
  const [srcCacheBuster, setSrcCacheBuster] = useState(0);
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch program data from API
  useEffect(() => {
    const fetchProgram = async () => {
      try {
        // First try to fetch from API
        const response = await fetch(`${API_SERVER}/credit-forms/${programId}`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setProgram(data);
        } else {
          // Fallback to static data
          const staticProgram = staticPrograms.find((p) => p.id === programId);
          setProgram(staticProgram || null);
        }
      } catch (error) {
        console.error('Error fetching program:', error);
        // Fallback to static data
        const staticProgram = staticPrograms.find((p) => p.id === programId);
        setProgram(staticProgram || null);
      } finally {
        setLoading(false);
      }
    };

    fetchProgram();
  }, [programId]);

  if (loading) {
    return (
      <div className="container py-4">
        <p>Loading form...</p>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="container py-4">
        <h2 className="mb-2" style={{ margin: 0 }}>
          Credit Count Form
        </h2>
        <p className="text-muted">
          Unknown program: <code>{programId}</code>
        </p>
        <ActionButton onClick={() => navigate('/requirements')}>← Back to Form Selection</ActionButton>
      </div>
    );
  }

  let effectiveSrc = null;
  if (program?.pdf) {
    effectiveSrc = program.pdf;
    // If the PDF path starts with /api/, it's from our API, prepend the server
    if (effectiveSrc.startsWith('/api/')) {
      effectiveSrc = API_SERVER.replace('/api', '') + effectiveSrc;
    }
    if (srcCacheBuster) {
      effectiveSrc += `?v=${srcCacheBuster}`;
    }
  }

  const onBack = () => navigate('/requirements');

  const onClear = () => {
    // Just reload the PDF to clear any filled fields (quick + reliable)
    setSrcCacheBuster((n) => n + 1);
  };

  const onDownloadPrint = () => {
    // Prints the embedded PDF; user can choose "Save as PDF"
    try {
      iframeRef.current?.contentWindow?.focus();
      iframeRef.current?.contentWindow?.print();
    } catch {
      globalThis.alert("Unable to trigger print automatically. Use the viewer's print button or your browser menu.");
    }
  };

  const onSave = () => {
    // Placeholder for future persistence
    globalThis.alert('Saving will require login—placeholder for now.');
  };

  return (
    <div className="container py-4">
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h2 className="mb-2" style={{ margin: 0 }}>
          Credit Count Form
        </h2>
        <p className="text-muted" style={{ margin: '6px 0 16px 0' }}>
          {program.title} — Manually track your degree progress by filling out this form.
        </p>

        {/* Button bar */}
        <div className="d-flex gap-2 flex-wrap mb-3" style={{ gap: 12 }}>
          <ActionButton onClick={onBack}>←&nbsp;Back to Form Selection</ActionButton>
          <ActionButton onClick={onSave} variant="solid">
            💾&nbsp;Save Form
          </ActionButton>
          <ActionButton onClick={onClear}>♻️&nbsp;Clear Form</ActionButton>
          <ActionButton onClick={onDownloadPrint}>⬇️&nbsp;Download/Print</ActionButton>
        </div>

        {/* PDF viewer */}
        {effectiveSrc ? (
          <div
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 1px 4px rgba(0,0,0,.06)',
            }}
          >
            <iframe
              ref={iframeRef}
              title={`${program.title} credit count form`}
              src={effectiveSrc + '#toolbar=1&navpanes=0&scrollbar=1'}
              style={{ width: '100%', height: '80vh', border: 0 }}
            />
          </div>
        ) : (
          <div className="alert alert-info">
            The PDF for <strong>{program.title}</strong> is not available yet. Please check back soon.
          </div>
        )}
      </div>
    </div>
  );
}

