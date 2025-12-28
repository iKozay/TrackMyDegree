import React from 'react';

const DegreeAuditSkeleton: React.FC = () => {
    return (
        <div className="degree-audit-page">
            {/* Skeleton Header */}
            <div className="da-header">
                <div className="da-title">
                    <div className="skeleton skeleton-title" style={{ width: '250px' }}></div>
                    <div className="skeleton skeleton-text" style={{ width: '350px' }}></div>
                </div>
                <div className="da-actions">
                    <div className="skeleton" style={{ width: '120px', height: '38px', borderRadius: '8px' }}></div>
                    <div className="skeleton" style={{ width: '140px', height: '38px', borderRadius: '8px' }}></div>
                </div>
            </div>

            {/* Skeleton Student Info Card */}
            <div className="card">
                <div className="info-grid">
                    <div>
                        <div className="skeleton skeleton-title" style={{ width: '180px', marginBottom: '20px' }}></div>
                        <div className="info-rows">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="info-row" style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                                    <div className="skeleton" style={{ width: '80px', height: '14px' }}></div>
                                    <div className="skeleton" style={{ width: '120px', height: '14px' }}></div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <div className="skeleton skeleton-title" style={{ width: '150px', marginBottom: '20px' }}></div>
                        <div className="info-rows">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="info-row" style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                                    <div className="skeleton" style={{ width: '100px', height: '14px' }}></div>
                                    <div className="skeleton" style={{ width: '90px', height: '14px' }}></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="skeleton" style={{ width: '100%', height: '1px', marginTop: '2rem' }}></div>

                {/* Skeleton Overall Progress */}
                <div className="audit-progress" style={{ marginTop: '2rem' }}>
                    <div className="progress-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div className="skeleton" style={{ width: '150px', height: '18px' }}></div>
                        <div className="skeleton" style={{ width: '40px', height: '24px' }}></div>
                    </div>
                    <div className="skeleton" style={{ width: '100%', height: '10px', borderRadius: '99px', marginBottom: '12px' }}></div>
                    <div className="progress-legends" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div className="skeleton" style={{ width: '120px', height: '12px' }}></div>
                        <div className="skeleton" style={{ width: '120px', height: '12px' }}></div>
                        <div className="skeleton" style={{ width: '120px', height: '12px' }}></div>
                    </div>
                </div>
            </div>

            {/* Skeleton Notices */}
            <div className="card">
                <div className="skeleton skeleton-title" style={{ width: '180px', marginBottom: '20px' }}></div>
                <div className="notices-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[1, 2].map(i => (
                        <div key={i} className="skeleton" style={{ width: '100%', height: '54px', borderRadius: '10px' }}></div>
                    ))}
                </div>
            </div>

            {/* Skeleton Requirements */}
            <div className="card">
                <div className="skeleton skeleton-title" style={{ width: '220px', marginBottom: '20px' }}></div>
                <div className="requirements-list">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid var(--slate-100)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <div className="skeleton" style={{ width: '150px', height: '18px' }}></div>
                                    <div className="skeleton" style={{ width: '80px', height: '20px', borderRadius: '8px' }}></div>
                                </div>
                                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                    <div className="skeleton" style={{ width: '120px', height: '14px' }}></div>
                                    <div className="skeleton" style={{ width: '18px', height: '18px' }}></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DegreeAuditSkeleton;
