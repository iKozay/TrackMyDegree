import React, { useEffect, useState } from 'react';
import { Download, FileText, AlertTriangle, CheckCircle, Circle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { generateMockDegreeAudit, type DegreeAuditData, type RequirementCategory } from '../../mock/degreeAuditGenerator';
import './DegreeAuditPage.css';

const DegreeAuditPage: React.FC = () => {
    const [data, setData] = useState<DegreeAuditData | null>(null);
    const [expandedReqs, setExpandedReqs] = useState<Set<string>>(new Set());

    useEffect(() => {
        // Simulate API fetch
        const mockData = generateMockDegreeAudit();
        setData(mockData);
        // Expand first requirement by default
        if (mockData.requirements.length > 0) {
            setExpandedReqs(new Set([mockData.requirements[0].id]));
        }
    }, []);

    const toggleReq = (id: string) => {
        const newExpanded = new Set(expandedReqs);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedReqs(newExpanded);
    };

    if (!data) return <div className="p-5">Loading...</div>;

    return (
        <div className="degree-audit-page">
            {/* Header */}
            <div className="da-header">
                <div className="da-title">
                    <h2>Unofficial Degree Audit</h2>
                    <p>Comprehensive analysis of your degree progress</p>
                </div>
                <div className="da-actions">
                    <button className="btn btn-outline">
                        <Download size={18} /> Export PDF
                    </button>
                    <button className="btn btn-primary">
                        <FileText size={18} /> Generate Audit
                    </button>
                </div>
            </div>

            {/* Student Info Card */}
            <div className="card">
                <div className="info-grid">
                    <div>
                        <h3 className="section-title">Student Information</h3>
                        <div className="info-rows">
                            <div className="info-row">
                                <span className="label">Name:</span>
                                <span className="value">{data.student.name}</span>
                            </div>
                            <div className="info-row">
                                <span className="label">Student ID:</span>
                                <span className="value">{data.student.studentId}</span>
                            </div>
                            <div className="info-row">
                                <span className="label">Program:</span>
                                <span className="value">{data.student.program}</span>
                            </div>
                            <div className="info-row">
                                <span className="label">Academic Advisor:</span>
                                <span className="value">{data.student.advisor}</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h3 className="section-title">Audit Summary</h3>
                        <div className="info-rows">
                            <div className="info-row">
                                <span className="label">GPA:</span>
                                <span className="value">{data.student.gpa}</span>
                            </div>
                            <div className="info-row">
                                <span className="label">Admission Term:</span>
                                <span className="value">{data.student.admissionTerm}</span>
                            </div>
                            <div className="info-row">
                                <span className="label">Expected Graduation:</span>
                                <span className="value">{data.student.expectedGraduation}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Overall Progress */}
                <div className="audit-progress">
                    <h3 className="section-title" style={{ marginTop: '2rem' }}>Overall Progress</h3>
                    <div className="progress-header">
                        <span>{data.progress.completed} credits completed</span>
                        <span className="progress-percentage">{data.progress.percentage}%</span>
                    </div>
                    <div className="progress-bar-container">
                        <div
                            className="progress-bar-fill"
                            style={{ width: `${data.progress.percentage}%` }}
                        ></div>
                    </div>
                    <div className="progress-legends">
                        <span>{data.progress.completed} credits completed</span>
                        <span>{data.progress.inProgress} credits in progress</span>
                        <span>{data.progress.remaining} credits remaining</span>
                    </div>
                </div>
            </div>

            {/* Notices */}
            <div className="card">
                <h3 className="section-title">
                    <AlertTriangle size={20} style={{ display: 'inline', marginRight: '0.5rem', marginTop: '-4px' }} color="#F59E0B" />
                    Important Notices
                </h3>
                <div className="notices-list">
                    {data.notices.map(notice => (
                        <div key={notice.id} className={`notice-item notice-${notice.type}`}>
                            {notice.type === 'warning' ? <AlertTriangle size={18} /> :
                                notice.type === 'info' ? <Circle size={18} /> : <CheckCircle size={18} />}
                            {notice.message}
                        </div>
                    ))}
                </div>
            </div>

            {/* Requirements Breakdown */}
            <div className="card">
                <h3 className="section-title">Requirements Breakdown</h3>
                <div className="requirements-list">
                    {data.requirements.map(req => (
                        <RequirementItem
                            key={req.id}
                            req={req}
                            isExpanded={expandedReqs.has(req.id)}
                            toggle={() => toggleReq(req.id)}
                        />
                    ))}
                </div>
            </div>

            {/* Disclaimer Note */}
            <div className="disclaimer-note">
                <strong>Note:</strong> This is an unofficial audit for planning purposes only. Please consult with your academic advisor for official degree evaluation.
            </div>
        </div>
    );
};

const RequirementItem: React.FC<{
    req: RequirementCategory,
    isExpanded: boolean,
    toggle: () => void
}> = ({ req, isExpanded, toggle }) => {

    const percentage = Math.round((req.creditsCompleted / req.creditsTotal) * 100);

    const renderBadges = () => {
        const badges: React.ReactNode[] = [];

        // Primary status badge
        if (req.status === 'In Progress') {
            badges.push(<span key="status" className="badge badge-progress">In Progress</span>);
        } else if (req.status === 'Complete') {
            badges.push(<span key="status" className="badge badge-complete">Complete</span>);
        } else if (req.status === 'Incomplete') {
            badges.push(<span key="status" className="badge badge-incomplete">Incomplete</span>);
        } else if (req.status === 'Not Started') {
            badges.push(<span key="status" className="badge badge-notstarted">Not Started</span>);
        } else if (req.status === 'Missing') {
            badges.push(<span key="status" className="badge badge-missing">Missing</span>);
        }

        // Secondary missing badge if count > 0
        if (req.missingCount && req.missingCount > 0) {
            badges.push(<span key="missing" className="badge badge-missing" style={{ marginLeft: '8px' }}>{req.missingCount} missing</span>);
        }

        return badges;
    };

    const creditsInProgress = req.courses
        .filter(c => c.status === 'In Progress')
        .reduce((acc, c) => acc + c.credits, 0);

    const creditsRemaining = Math.max(0, req.creditsTotal - req.creditsCompleted - creditsInProgress);

    return (
        <div className="requirement-group">
            <div className="req-header-row" onClick={toggle}>
                <div className="req-title-group">
                    <span className="req-name">{req.title}</span>
                    <div style={{ display: 'flex' }}>
                        {renderBadges()}
                    </div>
                </div>
                <div className="req-stats">
                    <span>{req.creditsCompleted}/{req.creditsTotal} credits ({percentage}%)</span>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
            </div>

            {isExpanded && (
                <div className="courses-list">
                    {/* Requirement Progress Bar */}
                    <div className="req-progress-container">
                        <div className="req-progress-bar">
                            <div
                                className="req-progress-fill completed"
                                style={{ width: `${percentage}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Credit summary legend */}
                    <div className="req-credit-legend">
                        <span className="legend-item legend-completed">
                            <CheckCircle size={20} />
                            {req.creditsCompleted} credits completed
                        </span>
                        {creditsInProgress > 0 && (
                            <span className="legend-item legend-inprogress">
                                <Circle size={20} />
                                {creditsInProgress} credits in progress
                            </span>
                        )}
                        {creditsRemaining > 0 && (
                            <span className="legend-item legend-remaining">
                                <XCircle size={20} />
                                {creditsRemaining} credits remaining
                            </span>
                        )}
                    </div>

                    {req.courses.map(course => (
                        <div key={course.id} className="course-item">
                            <div className="course-info">
                                <span className="course-icon">
                                    {course.status === 'Completed' && <CheckCircle className="text-success" size={20} />}
                                    {course.status === 'In Progress' && <Circle className="text-primary" size={20} />}
                                    {course.status === 'Missing' && <XCircle className="text-danger" size={20} />}
                                    {course.status === 'Not Started' && <Circle className="text-gray" size={20} />}
                                </span>
                                <div className="course-details">
                                    <span className="course-code">{course.code} - {course.title}</span>
                                    <span className="course-meta">
                                        <span className="grade-tag">{course.credits} credits</span>
                                        {course.grade && <span className="grade-tag">• Grade: {course.grade}</span>}
                                    </span>
                                </div>
                            </div>
                            <div className="course-status-badge">
                                {course.status === 'Completed' && <span className="badge badge-complete">Completed</span>}
                                {course.status === 'In Progress' && <span className="badge badge-progress">In Progress</span>}
                                {course.status === 'Missing' && <span className="badge badge-missing">Missing</span>}
                                {course.status === 'Not Started' && <span className="badge badge-notstarted">Not Started</span>}
                            </div>
                        </div>
                    ))}
                    {req.courses.length === 0 && (
                        <div className="p-3 text-gray-500 italic text-sm">No courses listed for this requirement.</div>
                    )}
                </div>
            )}

            <hr style={{ borderColor: 'var(--slate-200)', margin: '0.5rem 0', opacity: 0.5 }} />
        </div>
    );
};

export default DegreeAuditPage;
