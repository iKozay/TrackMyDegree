import React, { type ReactNode, useState, useEffect } from 'react';
import { LayoutDashboard, ListChecks, FileCheck, Briefcase, Calendar, GraduationCap, Menu, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import './DashboardLayout.css';

interface DashboardLayoutProps {
    children: ReactNode;
}

interface MenuItem {
    label: string;
    icon: React.ReactNode;
    path: string;
    badge?: string;
    disabled?: boolean;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [activeRole, setActiveRole] = useState<'Student' | 'Advisor'>('Student');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Close sidebar on mobile when route changes
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [location.pathname]);

    const baseMenuItems: MenuItem[] = [
        { label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard', disabled: true },
        { label: 'Missing Requirements', icon: <ListChecks size={20} />, path: '/missing-requirements', disabled: true },
        { label: 'Degree Audit', icon: <FileCheck size={20} />, path: '/degree-audit' },
        { label: 'Co-op Sequence', icon: <Briefcase size={20} />, path: '/co-op', disabled: true },
    ];

    const advisorMenuItems: MenuItem[] = [
        { label: 'Class Builder', icon: <Calendar size={20} />, path: '/class-builder', badge: 'Advisor', disabled: true },
    ];

    const menuItems: MenuItem[] = activeRole === 'Advisor'
        ? [...baseMenuItems, ...advisorMenuItems]
        : baseMenuItems;

    return (
        <div className="dashboard-container">
            {/* Mobile Header */}
            <header className="mobile-header">
                <div className="sidebar-header-section mobile-header-logo">
                    <div className="logo-wrapper">
                        <GraduationCap className="logo-icon-main" strokeWidth={2} />
                        <div className="logo-title-group">
                            <h1>TrackMyDegree</h1>
                            <p>Concordia University</p>
                        </div>
                    </div>
                </div>
                <button className="hamburger-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                    {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </header>

            {/* Sidebar Overlay */}
            {isSidebarOpen && (
                <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
            )}

            <aside className={`dashboard-sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header-section">
                    <div className="logo-wrapper">
                        <GraduationCap className="logo-icon-main" strokeWidth={2} />
                        <div className="logo-title-group">
                            <h1>TrackMyDegree</h1>
                            <p>Concordia University</p>
                        </div>
                    </div>
                </div>

                <div className="header-divider"></div>

                <div className="role-toggle-section">
                    <div className="role-button-group">
                        <button
                            onClick={() => setActiveRole('Student')}
                            className={`role-toggle-btn ${activeRole === 'Student' ? 'active' : ''}`}
                        >
                            Student
                        </button>
                        <button
                            onClick={() => setActiveRole('Advisor')}
                            className={`role-toggle-btn ${activeRole === 'Advisor' ? 'active' : ''}`}
                        >
                            Advisor
                        </button>
                    </div>
                </div>

                <nav className="sidebar-nav-container">
                    <ul className="nav-list">
                        {menuItems.map((item) => (
                            <li key={item.path}>
                                <button
                                    className={`nav-item-btn ${location.pathname === item.path ? 'active' : ''}`}
                                    onClick={() => navigate(item.path)}
                                    disabled={item.disabled}
                                >
                                    <span className="nav-item-icon">
                                        {React.cloneElement(item.icon as React.ReactElement<any>, { size: 20 })}
                                    </span>
                                    <span className="nav-item-label">{item.label}</span>
                                    {item.badge && (
                                        <span className="nav-item-badge">
                                            {item.badge}
                                        </span>
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="sidebar-footer-section">
                    <div className="user-profile-card">
                        <div className="user-avatar-circle">
                            <span className="user-avatar-text">JS</span>
                        </div>
                        <div className="user-details">
                            <p className="user-name-text">John Smith</p>
                            <p className="user-id-text">
                                {activeRole === 'Student' ? 'Student ID: 40123456' : 'Academic Advisor'}
                            </p>
                        </div>
                    </div>
                </div>
            </aside>

            <main className="dashboard-main">
                {children}
            </main>
        </div>
    );
};

export default DashboardLayout;
