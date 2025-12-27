import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DashboardLayout from '../../components/DashboardLayout/DashboardLayout';
import { useNavigate, useLocation } from 'react-router-dom';

vi.mock('react-router-dom', () => ({
    useNavigate: vi.fn(),
    useLocation: vi.fn(),
}));

describe('DashboardLayout', () => {
    const mockNavigate = vi.fn();
    const mockLocation = { pathname: '/dashboard' };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useNavigate).mockReturnValue(mockNavigate);
        vi.mocked(useLocation).mockReturnValue(mockLocation as any);
    });

    it('should render children and sidebar', () => {
        render(
            <DashboardLayout>
                <div data-testid="child">Test Child</div>
            </DashboardLayout>
        );

        expect(screen.getByTestId('child')).toBeTruthy();
        expect(screen.getAllByText('TrackMyDegree').length).toBeGreaterThan(0);
    });

    it('should toggle sidebar on mobile hamburger click', () => {
        const { container } = render(
            <DashboardLayout>
                <div>Test Child</div>
            </DashboardLayout>
        );

        const hamburgerBtn = container.querySelector('.hamburger-btn');
        expect(hamburgerBtn).toBeTruthy();

        fireEvent.click(hamburgerBtn!);

        const sidebar = container.querySelector('.dashboard-sidebar');
        expect(sidebar?.classList.contains('open')).toBe(true);

        // Click again to close (the icon changes but the button is the same)
        fireEvent.click(hamburgerBtn!);
        expect(sidebar?.classList.contains('open')).toBe(false);
    });

    it('should switch roles', () => {
        render(
            <DashboardLayout>
                <div>Test Child</div>
            </DashboardLayout>
        );

        const advisorBtn = screen.getByText('Advisor');
        fireEvent.click(advisorBtn);

        expect(advisorBtn.classList.contains('active')).toBe(true);
        expect(screen.getByText('Academic Advisor')).toBeTruthy();

        const studentBtn = screen.getByText('Student');
        fireEvent.click(studentBtn);
        expect(studentBtn.classList.contains('active')).toBe(true);
    });

    it('should navigate when menu item is clicked', () => {
        render(
            <DashboardLayout>
                <div>Test Child</div>
            </DashboardLayout>
        );

        const degreeAuditBtn = screen.getByText('Degree Audit');
        fireEvent.click(degreeAuditBtn);

        expect(mockNavigate).toHaveBeenCalledWith('/degree-audit');
    });

    it('should be disabled for some menu items', () => {
        render(
            <DashboardLayout>
                <div>Test Child</div>
            </DashboardLayout>
        );

        const dashboardBtn = screen.getByText('Dashboard').closest('button');
        expect(dashboardBtn?.disabled).toBe(true);
    });

    it('should close sidebar when clicking overlay', () => {
        const { container } = render(
            <DashboardLayout>
                <div>Test Child</div>
            </DashboardLayout>
        );

        const hamburgerBtn = container.querySelector('.hamburger-btn');
        fireEvent.click(hamburgerBtn!);

        const overlay = container.querySelector('.sidebar-overlay');
        expect(overlay).toBeTruthy();
        fireEvent.click(overlay!);

        const sidebar = container.querySelector('.dashboard-sidebar');
        expect(sidebar?.classList.contains('open')).toBe(false);
    });

    it('should close sidebar when route changes', () => {
        const { container, rerender } = render(
            <DashboardLayout>
                <div>Test Child</div>
            </DashboardLayout>
        );

        // Open sidebar
        const hamburgerBtn = container.querySelector('.hamburger-btn');
        fireEvent.click(hamburgerBtn!);

        // Simulate route change by changing location mock and rerendering
        vi.mocked(useLocation).mockReturnValue({ pathname: '/degree-audit' } as any);
        rerender(
            <DashboardLayout>
                <div>Test Child</div>
            </DashboardLayout>
        );

        const sidebar = container.querySelector('.dashboard-sidebar');
        expect(sidebar?.classList.contains('open')).toBe(false);
    });

    it('should show advisor specific menu items in advisor role', () => {
        render(
            <DashboardLayout>
                <div>Test Child</div>
            </DashboardLayout>
        );

        const advisorBtn = screen.getByText('Advisor');
        fireEvent.click(advisorBtn);

        expect(screen.getByText('Class Builder')).toBeTruthy();
    });
});
