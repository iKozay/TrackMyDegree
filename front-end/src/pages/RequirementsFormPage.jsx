import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import programs from '../data/requirementsPrograms';

export default function RequirementsFormPage() {
  const navigate = useNavigate();
  const { programId } = useParams();
  const program = useMemo(() => programs.find((p) => p.id === programId), [programId]);

  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  if (!program) {
    return (
      <div className="container py-4">
        <p className="text-danger">Unknown program.</p>
        <button className="btn btn-outline-secondary" onClick={() => navigate('/requirements')}>
          ← Back to Form Selection
        </button>
      </div>
    );
  }

  const onBack = () => {
    if (dirty && !window.confirm('You have unsaved changes. Discard them and go back?')) return;
    navigate('/requirements');
  };

  const onSave = () => {
    alert('Save requires sign-in. This will be implemented later.');
  };

  const onClear = () => {
    // will reset PDF fields in the next milestone
    setDirty(false);
    alert('Form cleared (placeholder).');
  };

  const onDownload = () => {
    // will export a filled PDF in the next milestone; for now, allow print
    window.print();
  };

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="mb-0">Credit Count Form</h2>
      </div>
      <p className="text-muted mb-3">
        {program.title} — Manually track your degree progress by filling out this form
      </p>

      <div className="d-flex gap-2 flex-wrap mb-3">
        <button className="btn btn-outline-secondary" onClick={onBack}>
          ← Back to Form Selection
        </button>
        <button className="btn btn-danger" onClick={onSave} disabled>
          Save Form (Sign in required)
        </button>
        <button className="btn btn-outline-secondary" onClick={onClear}>
          Clear Form
        </button>
        <button className="btn btn-outline-secondary" onClick={onDownload}>
          Download/Print
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          <div
            className="rounded"
            style={{
              height: 720,
              background: '#f7f7f7',
              border: '1px dashed #ccc',
              display: 'grid',
              placeItems: 'center',
              color: '#666',
            }}
          >
            <div>
              <div className="mb-2 text-center" style={{ fontWeight: 600 }}>
                {program.title} — Credit Count Form
              </div>
              <div className="text-center">PDF viewer goes here (next milestone)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
