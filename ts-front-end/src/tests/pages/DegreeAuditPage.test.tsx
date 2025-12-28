import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DegreeAuditPage from '../../pages/DegreeAuditPage.tsx';
import { generateMockDegreeAudit } from '../../types/audit.types.ts';

vi.mock('../../mock/degreeAudit');

describe('DegreeAuditPage', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        // Default mock implementation
        vi.mocked(generateMockDegreeAudit).mockReturnValue({
            student: {
                name: "Test Student",
                studentId: "123",
                program: "CS",
                advisor: "Dr. A",
                gpa: "4.0",
                admissionTerm: "F24",
                expectedGraduation: "S28"
            },
            progress: { completed: 10, inProgress: 5, remaining: 105, total: 120, percentage: 8 },
            notices: [{ id: "1", type: "info", message: "Test Notice" }],
            requirements: [{
                id: "req1",
                title: "Test Requirement",
                status: "In Progress",
                creditsCompleted: 3,
                creditsTotal: 12,
                courses: [{ id: "c1", code: "COMP 101", title: "Intro", credits: 3, status: "Completed", grade: "A" }]
            }]
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should show loading skeleton initially', () => {
        render(<DegreeAuditPage />);
        expect(document.querySelector('.skeleton')).toBeTruthy();
    });

    it('should show data after loading', async () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        render(<DegreeAuditPage />);

        await act(async () => {
            vi.advanceTimersByTime(1500);
        });

        expect(screen.getByText('Unofficial Degree Audit')).toBeTruthy();
        expect(screen.getByText('Test Student')).toBeTruthy();
    });

    it('should show error state when fetch fails', async () => {
        const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.05);
        render(<DegreeAuditPage />);

        await act(async () => {
            vi.advanceTimersByTime(1500);
        });

        expect(screen.getByText('Something went wrong')).toBeTruthy();

        // Test retry
        mockRandom.mockReturnValue(0.5);
        const retryBtn = screen.getByText('Try Again');
        fireEvent.click(retryBtn);

        await act(async () => {
            vi.advanceTimersByTime(1500);
        });

        expect(screen.getByText('Unofficial Degree Audit')).toBeTruthy();
    });

    it('should show empty state when no data or no requirements', async () => {
        vi.mocked(generateMockDegreeAudit).mockReturnValue({
            student: { name: "", studentId: "", program: "", advisor: "", gpa: "", admissionTerm: "", expectedGraduation: "" },
            progress: { completed: 0, inProgress: 0, remaining: 0, total: 0, percentage: 0 },
            notices: [],
            requirements: []
        });
        vi.spyOn(Math, 'random').mockReturnValue(0.5);

        render(<DegreeAuditPage />);

        await act(async () => {
            vi.advanceTimersByTime(1500);
        });

        expect(screen.getByText('No Audit Data Found')).toBeTruthy();

        const generateBtn = screen.getByText('Generate Audit');
        fireEvent.click(generateBtn);

        await act(async () => {
            vi.advanceTimersByTime(1500);
        });
    });

    it('should toggle requirement expansion', async () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        render(<DegreeAuditPage />);

        await act(async () => {
            vi.advanceTimersByTime(1500);
        });

        const reqHeader = screen.getByText('Test Requirement');
        expect(screen.getByText('COMP 101 - Intro')).toBeTruthy();

        fireEvent.click(reqHeader);
        expect(screen.queryByText('COMP 101 - Intro')).toBeNull();

        fireEvent.click(reqHeader);
        expect(screen.getByText('COMP 101 - Intro')).toBeTruthy();
    });

    it('should render various requirement and course statuses and badges', async () => {
        vi.mocked(generateMockDegreeAudit).mockReturnValue({
            student: { name: "Test Student", studentId: "123", program: "CS", advisor: "Dr. A", gpa: "4.0", admissionTerm: "F24", expectedGraduation: "S28" },
            progress: { completed: 10, inProgress: 5, remaining: 105, total: 120, percentage: 8 },
            notices: [
                { id: "n1", type: "warning", message: "Warning Notice" },
                { id: "n2", type: "info", message: "Info Notice" },
                { id: "n3", type: "success", message: "Success Notice" },
            ],
            requirements: [
                {
                    id: "req-all",
                    title: "Status Test Req",
                    status: "In Progress",
                    creditsCompleted: 3,
                    creditsTotal: 15,
                    missingCount: 2,
                    courses: [
                        { id: "c1", code: "C1", title: "T1", credits: 3, status: "Completed", grade: "A" },
                        { id: "c2", code: "C2", title: "T2", credits: 3, status: "In Progress" },
                        { id: "c3", code: "C3", title: "T3", credits: 3, status: "Missing" },
                        { id: "c4", code: "C4", title: "T4", credits: 3, status: "Not Started" },
                    ]
                },
                {
                    id: "req-complete",
                    title: "Complete Req",
                    status: "Complete",
                    creditsCompleted: 3,
                    creditsTotal: 3,
                    courses: []
                },
                {
                    id: "req-incomplete",
                    title: "Incomplete Req",
                    status: "Incomplete",
                    creditsCompleted: 0,
                    creditsTotal: 3,
                    courses: []
                },
                {
                    id: "req-notstarted",
                    title: "Not Started Req",
                    status: "Not Started",
                    creditsCompleted: 0,
                    creditsTotal: 3,
                    courses: []
                },
                {
                    id: "req-missing",
                    title: "Missing Req",
                    status: "Missing",
                    creditsCompleted: 0,
                    creditsTotal: 3,
                    courses: []
                }
            ]
        });
        vi.spyOn(Math, 'random').mockReturnValue(0.5);

        render(<DegreeAuditPage />);

        await act(async () => {
            vi.advanceTimersByTime(1500);
        });

        expect(screen.getByText("Warning Notice")).toBeTruthy();
        expect(screen.getByText("Info Notice")).toBeTruthy();
        expect(screen.getByText("Success Notice")).toBeTruthy();
        // Assertions for status badges (may have multiple)
        expect(screen.getAllByText("In Progress").length).toBeGreaterThan(0);
        expect(screen.getByText("Complete")).toBeTruthy();
        expect(screen.getByText("Incomplete")).toBeTruthy();
        expect(screen.getAllByText("Not Started").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Missing").length).toBeGreaterThan(0);
        expect(screen.getByText("2 missing")).toBeTruthy();

        expect(screen.getByText("C1 - T1")).toBeTruthy();
        expect(screen.getByText(/Grade: A/)).toBeTruthy();
        expect(screen.getAllByText("3 credits").length).toBeGreaterThan(0);

        // Check legends
        expect(screen.getByText("3 credits completed")).toBeTruthy();
        expect(screen.getByText("3 credits in progress")).toBeTruthy();
        expect(screen.getByText("9 credits remaining")).toBeTruthy();

        const completeReq = screen.getByText("Complete Req");
        fireEvent.click(completeReq);
        expect(screen.getByText("No courses listed for this requirement.")).toBeTruthy();
    });

    it('should handle unexpected error type', async () => {
        const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.5); // Avoid hardcoded error

        // Mock generateMockDegreeAudit to throw a non-Error object
        vi.mocked(generateMockDegreeAudit).mockImplementation(() => {
            throw "String error";
        });

        render(<DegreeAuditPage />);

        await act(async () => {
            vi.advanceTimersByTime(1500);
        });

        expect(screen.getByText('An unexpected error occurred')).toBeTruthy();
        mockRandom.mockRestore();
        vi.mocked(generateMockDegreeAudit).mockRestore();
    });

    it('should handle unknown requirement status for coverage', async () => {
        vi.mocked(generateMockDegreeAudit).mockReturnValue({
            ...generateMockDegreeAudit(),
            requirements: [{
                id: "unknown",
                title: "Unknown",
                status: "Unknown" as any,
                creditsCompleted: 0,
                creditsTotal: 3,
                courses: []
            }]
        });
        vi.spyOn(Math, 'random').mockReturnValue(0.5);

        render(<DegreeAuditPage />);

        await act(async () => {
            vi.advanceTimersByTime(1500);
        });

        expect(screen.getByText("Unknown")).toBeTruthy();
    });
});
