import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CreditFormManager } from '../../components/CreditFormManager';

// Mock the API functions
vi.mock('../../../api/creditFormsApi', () => ({
    fetchCreditForms: vi.fn(),
    createCreditForm: vi.fn(),
    updateCreditForm: vi.fn(),
    deleteCreditForm: vi.fn(),
    migrateCreditForms: vi.fn(),
}));

// Mock react-toastify
vi.mock('react-toastify', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
    },
}));

import {
    fetchCreditForms,
    createCreditForm,
    updateCreditForm,
    deleteCreditForm,
    migrateCreditForms,
} from '../../api/creditFormsApi';
import { toast } from 'react-toastify';

const mockForms = [
    {
        _id: 'form-1',
        programId: 'software-engineering',
        title: 'Software Engineering',
        subtitle: 'Bachelor of Software Engineering Credit Count Form',
        filename: 'software-engineering.pdf',
        isActive: true,
    },
    {
        _id: 'form-2',
        programId: 'computer-science',
        title: 'Computer Science',
        subtitle: 'Bachelor of Computer Science Credit Count Form',
        filename: 'computer-science.pdf',
        isActive: true,
    },
];

const renderComponent = () => {
    return render(
        <MemoryRouter>
            <CreditFormManager />
        </MemoryRouter>
    );
};

describe('CreditFormManager', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (fetchCreditForms as ReturnType<typeof vi.fn>).mockResolvedValue(mockForms);
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe('Rendering', () => {
        test('renders loading state initially', () => {
            renderComponent();
            expect(screen.getByText('Loading...')).toBeInTheDocument();
        });

        test('renders title and buttons after loading', async () => {
            renderComponent();

            await waitFor(() => {
                expect(screen.getByText('Credit Forms Management')).toBeInTheDocument();
            });

            expect(screen.getByText('Migrate Existing Forms')).toBeInTheDocument();
            expect(screen.getByText('Add New Form')).toBeInTheDocument();
        });

        test('renders forms table with data', async () => {
            renderComponent();

            await waitFor(() => {
                expect(screen.getByText('Software Engineering')).toBeInTheDocument();
                expect(screen.getByText('Computer Science')).toBeInTheDocument();
            });
        });

        test('renders table headers', async () => {
            renderComponent();

            await waitFor(() => {
                expect(screen.getByText('Program ID')).toBeInTheDocument();
                expect(screen.getByText('Title')).toBeInTheDocument();
                expect(screen.getByText('Subtitle')).toBeInTheDocument();
                expect(screen.getByText('Actions')).toBeInTheDocument();
            });
        });

        test('renders Edit and Delete buttons for each form', async () => {
            renderComponent();

            await waitFor(() => {
                const editButtons = screen.getAllByText('Edit');
                const deleteButtons = screen.getAllByText('Delete');
                expect(editButtons).toHaveLength(2);
                expect(deleteButtons).toHaveLength(2);
            });
        });

        test('shows empty state when no forms exist', async () => {
            (fetchCreditForms as ReturnType<typeof vi.fn>).mockResolvedValue([]);
            renderComponent();

            await waitFor(() => {
                expect(screen.getByText('No credit forms found.')).toBeInTheDocument();
            });
        });
    });

    describe('Add Form Modal', () => {
        test('opens modal when Add New Form button is clicked', async () => {
            renderComponent();

            await waitFor(() => {
                expect(screen.getByText('Add New Form')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Add New Form'));

            expect(screen.getByText('Add Credit Form')).toBeInTheDocument();
        });

        test('modal contains all required form fields', async () => {
            renderComponent();

            await waitFor(() => {
                expect(screen.getByText('Add New Form')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Add New Form'));

            expect(screen.getByLabelText(/Program ID/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/Subtitle/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/PDF File/i)).toBeInTheDocument();
        });

        test('closes modal when Cancel button is clicked', async () => {
            renderComponent();

            await waitFor(() => {
                expect(screen.getByText('Add New Form')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Add New Form'));
            expect(screen.getByText('Add Credit Form')).toBeInTheDocument();

            fireEvent.click(screen.getByText('Cancel'));
            expect(screen.queryByText('Add Credit Form')).not.toBeInTheDocument();
        });

        test('submits form data when Save button is clicked', async () => {
            (createCreditForm as ReturnType<typeof vi.fn>).mockResolvedValue({
                form: { id: 'new-form' },
            });

            renderComponent();

            await waitFor(() => {
                expect(screen.getByText('Add New Form')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Add New Form'));

            fireEvent.change(screen.getByLabelText(/Program ID/i), { target: { value: 'new-program' } });
            fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'New Program' } });
            fireEvent.change(screen.getByLabelText(/Subtitle/i), { target: { value: 'New Program Description' } });

            // Create a mock file
            const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
            const fileInput = screen.getByLabelText(/PDF File/i);

            // Use fireEvent.change for file input
            fireEvent.change(fileInput, { target: { files: [file] } });

            fireEvent.click(screen.getByText('Save'));

            await waitFor(() => {
                expect(createCreditForm).toHaveBeenCalled();
            });
        });

        test('shows error toast on create failure', async () => {
            (createCreditForm as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Create failed'));

            renderComponent();

            await waitFor(() => {
                expect(screen.getByText('Add New Form')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Add New Form'));

            fireEvent.change(screen.getByLabelText(/Program ID/i), { target: { value: 'test' } });
            fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Test' } });
            fireEvent.change(screen.getByLabelText(/Subtitle/i), { target: { value: 'Test' } });

            const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
            fireEvent.change(screen.getByLabelText(/PDF File/i), { target: { files: [file] } });

            fireEvent.click(screen.getByText('Save'));

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalled();
            });
        });
    });

    describe('Edit Form Modal', () => {
        test('opens edit modal with pre-filled data', async () => {
            renderComponent();

            await waitFor(() => {
                expect(screen.getByText('Software Engineering')).toBeInTheDocument();
            });

            const editButtons = screen.getAllByText('Edit');
            fireEvent.click(editButtons[0]);

            expect(screen.getByText('Edit Credit Form')).toBeInTheDocument();
            expect(screen.getByDisplayValue('Software Engineering')).toBeInTheDocument();
        });

        test('updates form when save is clicked after edit', async () => {
            (updateCreditForm as ReturnType<typeof vi.fn>).mockResolvedValue({
                form: { id: 'form-1' },
            });

            renderComponent();

            await waitFor(() => {
                expect(screen.getByText('Software Engineering')).toBeInTheDocument();
            });

            const editButtons = screen.getAllByText('Edit');
            fireEvent.click(editButtons[0]);

            const titleInput = screen.getByDisplayValue('Software Engineering');
            fireEvent.change(titleInput, { target: { value: 'Updated Title' } });

            fireEvent.click(screen.getByText('Save'));

            await waitFor(() => {
                expect(updateCreditForm).toHaveBeenCalled();
            });
        });
    });

    describe('Delete Form', () => {
        test('calls delete when Delete button clicked and confirmed', async () => {
            (deleteCreditForm as ReturnType<typeof vi.fn>).mockResolvedValue({});

            // Mock window.confirm
            vi.spyOn(window, 'confirm').mockImplementation(() => true);

            renderComponent();

            await waitFor(() => {
                expect(screen.getByText('Software Engineering')).toBeInTheDocument();
            });

            const deleteButtons = screen.getAllByText('Delete');
            fireEvent.click(deleteButtons[0]);

            await waitFor(() => {
                expect(deleteCreditForm).toHaveBeenCalledWith('form-1');
            });
        });

        test('does not call delete when user cancels confirmation', async () => {
            vi.spyOn(window, 'confirm').mockImplementation(() => false);

            renderComponent();

            await waitFor(() => {
                expect(screen.getByText('Software Engineering')).toBeInTheDocument();
            });

            const deleteButtons = screen.getAllByText('Delete');
            fireEvent.click(deleteButtons[0]);

            expect(deleteCreditForm).not.toHaveBeenCalled();
        });

        test('shows success toast after successful delete', async () => {
            (deleteCreditForm as ReturnType<typeof vi.fn>).mockResolvedValue({});
            vi.spyOn(window, 'confirm').mockImplementation(() => true);

            renderComponent();

            await waitFor(() => {
                expect(screen.getByText('Software Engineering')).toBeInTheDocument();
            });

            const deleteButtons = screen.getAllByText('Delete');
            fireEvent.click(deleteButtons[0]);

            await waitFor(() => {
                expect(toast.success).toHaveBeenCalled();
            });
        });
    });

    describe('Migration', () => {
        test('calls migrate when Migrate button is clicked', async () => {
            (migrateCreditForms as ReturnType<typeof vi.fn>).mockResolvedValue({
                migratedCount: 5,
            });

            renderComponent();

            await waitFor(() => {
                expect(screen.getByText('Migrate Existing Forms')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Migrate Existing Forms'));

            await waitFor(() => {
                expect(migrateCreditForms).toHaveBeenCalled();
            });
        });

        test('shows success toast after successful migration', async () => {
            (migrateCreditForms as ReturnType<typeof vi.fn>).mockResolvedValue({
                migratedCount: 5,
            });

            renderComponent();

            await waitFor(() => {
                expect(screen.getByText('Migrate Existing Forms')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Migrate Existing Forms'));

            await waitFor(() => {
                expect(toast.success).toHaveBeenCalled();
            });
        });

        test('shows error toast on migration failure', async () => {
            (migrateCreditForms as ReturnType<typeof vi.fn>).mockRejectedValue(
                new Error('Migration failed')
            );

            renderComponent();

            await waitFor(() => {
                expect(screen.getByText('Migrate Existing Forms')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Migrate Existing Forms'));

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalled();
            });
        });

        test('button shows loading state during migration', async () => {
            let resolvePromise: (value: unknown) => void;
            (migrateCreditForms as ReturnType<typeof vi.fn>).mockImplementation(
                () => new Promise((resolve) => { resolvePromise = resolve; })
            );

            renderComponent();

            await waitFor(() => {
                expect(screen.getByText('Migrate Existing Forms')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Migrate Existing Forms'));

            expect(screen.getByText('Migrating...')).toBeInTheDocument();

            resolvePromise!({ migratedCount: 5 });

            await waitFor(() => {
                expect(screen.getByText('Migrate Existing Forms')).toBeInTheDocument();
            });
        });
    });

    describe('Error Handling', () => {
        test('shows error message when fetching forms fails', async () => {
            (fetchCreditForms as ReturnType<typeof vi.fn>).mockRejectedValue(
                new Error('Failed to fetch')
            );

            renderComponent();

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalled();
            });
        });

        test('refreshes form list after successful create', async () => {
            (createCreditForm as ReturnType<typeof vi.fn>).mockResolvedValue({
                form: { id: 'new-form' },
            });

            renderComponent();

            await waitFor(() => {
                expect(screen.getByText('Add New Form')).toBeInTheDocument();
            });

            // Open modal and fill form
            fireEvent.click(screen.getByText('Add New Form'));
            fireEvent.change(screen.getByLabelText(/Program ID/i), { target: { value: 'new' } });
            fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'New' } });
            fireEvent.change(screen.getByLabelText(/Subtitle/i), { target: { value: 'New' } });

            const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
            fireEvent.change(screen.getByLabelText(/PDF File/i), { target: { files: [file] } });

            fireEvent.click(screen.getByText('Save'));

            await waitFor(() => {
                // fetchCreditForms should be called again after create
                expect(fetchCreditForms).toHaveBeenCalledTimes(2);
            });
        });
    });

    describe('Styling', () => {
        test('title has correct styling', async () => {
            renderComponent();

            await waitFor(() => {
                const title = screen.getByText('Credit Forms Management');
                expect(title.tagName).toBe('H2');
            });
        });

        test('buttons have correct styling classes', async () => {
            renderComponent();

            await waitFor(() => {
                const migrateButton = screen.getByText('Migrate Existing Forms');
                expect(migrateButton.style.cursor).toBe('pointer');
            });
        });
    });
});
