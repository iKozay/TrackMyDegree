import React from 'react';
import { CreditFormManager } from '../components/CreditFormManager';
import { useNavigate } from 'react-router-dom';

const BURGUNDY = '#7a0019';

const CreditFormsManagementPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="container py-4">
            <div style={{ marginBottom: '16px' }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 16px',
                        borderRadius: 12,
                        fontWeight: 600,
                        border: `2px solid ${BURGUNDY}`,
                        background: '#fff',
                        color: '#111',
                        cursor: 'pointer',
                    }}
                >
                    ← Back
                </button>
            </div>
            <CreditFormManager />
        </div>
    );
};

export default CreditFormsManagementPage;
