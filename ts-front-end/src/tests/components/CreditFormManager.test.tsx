import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { CreditFormManager } from '../../components/CreditFormManager';

// Mock react-toastify
vi.mock('react-toastify', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock creditFormsApi
vi.mock('../../api/creditFormsApi', () => ({
    fetchCreditForms: vi.fn(),
    createCreditForm: vi.fn(),
    updateCreditForm: vi.fn(),
    deleteCreditForm: vi.fn(),
}));

import { toast } from 'react-toastify';
import {
    fetchCreditForms,
    createCreditForm,
    updateCreditForm,
    deleteCreditForm,
} from '../../api/creditFormsApi';

const mockForms = [
    {
        programId: 'software-engineering',
        title: 'Software Engineering',
        subtitle: 'Bachelor of Software Engineering Credit Count Form',
        pdf: '/api/credit-forms/file/software-engineering.pdf',
    },
    {
        programId: 'computer-science',
        title: 'Computer Science',
        subtitle: 'Bachelor of Computer Science Credit Count Form',
        pdf: '/api/credit-forms/file/computer-science.pdf',
    },
];

describe('CreditFormManager', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (fetchCreditForms as Mock).mockResolvedValue(mockForms);
        // Mock window.confirm
        vi.spyOn(window, 'confirm').mockReturnValue(true);
    });

    it('should show loading state initially', () => {
        (fetchCreditForms as Mock).mockReturnValue(new Promise(() => { })); // never resolves
        render(<CreditFormManager />);
        expect(screen.getByText('Loading forms...')).toBeInTheDocument();
    });

    it('should render forms table after loading', async () => {
        render(<CreditFormManager />);
        await waitFor(() => {
            expect(screen.getByText('Software Engineering')).toBeInTheDocument();
        });
        expect(screen.getByText('Computer Science')).toBeInTheDocument();
        expect(screen.getByText('Credit Forms Management')).toBeInTheDocument();
    });

    it('should render table headers correctly', async () => {
        render(<CreditFormManager />);
        await waitFor(() => {
            expect(screen.getByText('Title')).toBeInTheDocument();
        });
        expect(screen.getByText('Subtitle')).toBeInTheDocument();
        expect(screen.getByText('ID')).toBeInTheDocument();
        expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('should show empty state when no forms', async () => {
        (fetchCreditForms as Mock).mockResolvedValue([]);
        render(<CreditFormManager />);
        await waitFor(() => {
            expect(screen.getByText(/No credit forms found/)).toBeInTheDocument();
        });
    });

    it('should show error toast when loading fails', async () => {
        (fetchCreditForms as Mock).mockRejectedValue(new Error('Network error'));
        render(<CreditFormManager />);
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Failed to load credit forms');
        });
    });

    describe('Add Form Modal', () => {
        it('should open add modal when Add New Form is clicked', async () => {
            render(<CreditFormManager />);
            await waitFor(() => {
                expect(screen.getByText('Software Engineering')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Add New Form'));

            expect(screen.getByText('Add New Credit Form')).toBeInTheDocument();
            expect(screen.getByLabelText('Program ID')).toBeInTheDocument();
            expect(screen.getByLabelText('Title')).toBeInTheDocument();
            expect(screen.getByLabelText('Subtitle')).toBeInTheDocument();
            expect(screen.getByText('Create Form')).toBeInTheDocument();
            expect(screen.getByText('Cancel')).toBeInTheDocument();
        });

        it('should close modal when Cancel is clicked', async () => {
            render(<CreditFormManager />);
            await waitFor(() => {
                expect(screen.getByText('Software Engineering')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Add New Form'));
            expect(screen.getByText('Add New Credit Form')).toBeInTheDocument();

            fireEvent.click(screen.getByText('Cancel'));
            expect(screen.queryByText('Add New Credit Form')).not.toBeInTheDocument();
        });

        it('should submit new form successfully', async () => {
            (createCreditForm as Mock).mockResolvedValue({ id: 'new-form' });
            render(<CreditFormManager />);
            await waitFor(() => {
                expect(screen.getByText('Software Engineering')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Add New Form'));

            // Fill in form fields
            fireEvent.change(screen.getByLabelText('Program ID'), {
                target: { value: 'new-program' },
            });
            fireEvent.change(screen.getByLabelText('Title'), {
                target: { value: 'New Program' },
            });
            fireEvent.change(screen.getByLabelText('Subtitle'), {
                target: { value: 'New Program Credit Count Form' },
            });

            // Create a mock PDF file
            const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
            fireEvent.change(screen.getByLabelText(/PDF File/), {
                target: { files: [file] },
            });

            // Submit form - use fireEvent.submit to bypass jsdom's file input validation
            const form = screen.getByText('Create Form').closest('form')!;
            fireEvent.submit(form);

            await waitFor(() => {
                expect(createCreditForm).toHaveBeenCalled();
            });

            await waitFor(() => {
                expect(toast.success).toHaveBeenCalledWith('Form created successfully');
            });
        });

        it('should show error toast when form creation fails', async () => {
            (createCreditForm as Mock).mockRejectedValue(new Error('Server error'));
            render(<CreditFormManager />);
            await waitFor(() => {
                expect(screen.getByText('Software Engineering')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Add New Form'));

            fireEvent.change(screen.getByLabelText('Program ID'), {
                target: { value: 'new-program' },
            });
            fireEvent.change(screen.getByLabelText('Title'), {
                target: { value: 'New' },
            });
            fireEvent.change(screen.getByLabelText('Subtitle'), {
                target: { value: 'Sub' },
            });

            const file = new File(['pdf'], 'test.pdf', { type: 'application/pdf' });
            fireEvent.change(screen.getByLabelText(/PDF File/), {
                target: { files: [file] },
            });

            const form = screen.getByText('Create Form').closest('form')!;
            fireEvent.submit(form);

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('Failed to save form');
            });
        });
    });

    describe('Edit Form Modal', () => {
        it('should open edit modal with pre-filled data', async () => {
            render(<CreditFormManager />);
            await waitFor(() => {
                expect(screen.getByText('Software Engineering')).toBeInTheDocument();
            });

            // Click the first Edit button
            const editButtons = screen.getAllByText('Edit');
            fireEvent.click(editButtons[0]);

            expect(screen.getByText('Edit Credit Form')).toBeInTheDocument();
            expect(screen.getByText('Update Form')).toBeInTheDocument();
            // Program ID field should NOT be shown in edit mode
            expect(screen.queryByLabelText('Program ID')).not.toBeInTheDocument();
            // Title and subtitle should be pre-filled
            expect(screen.getByLabelText('Title')).toHaveValue('Software Engineering');
            expect(screen.getByLabelText('Subtitle')).toHaveValue(
                'Bachelor of Software Engineering Credit Count Form'
            );
        });

        it('should submit updated form successfully', async () => {
            (updateCreditForm as Mock).mockResolvedValue({ id: 'software-engineering' });
            render(<CreditFormManager />);
            await waitFor(() => {
                expect(screen.getByText('Software Engineering')).toBeInTheDocument();
            });

            const editButtons = screen.getAllByText('Edit');
            fireEvent.click(editButtons[0]);

            fireEvent.change(screen.getByLabelText('Title'), {
                target: { value: 'Updated Title' },
            });

            fireEvent.click(screen.getByText('Update Form'));

            await waitFor(() => {
                expect(updateCreditForm).toHaveBeenCalledWith(
                    'software-engineering',
                    'Updated Title',
                    'Bachelor of Software Engineering Credit Count Form',
                    undefined
                );
            });
        });
    });

    describe('Delete Form', () => {
        it('should delete form when confirmed', async () => {
            (deleteCreditForm as Mock).mockResolvedValue({});
            render(<CreditFormManager />);
            await waitFor(() => {
                expect(screen.getByText('Software Engineering')).toBeInTheDocument();
            });

            const deleteButtons = screen.getAllByText('Delete');
            fireEvent.click(deleteButtons[0]);

            expect(window.confirm).toHaveBeenCalled();
            await waitFor(() => {
                expect(deleteCreditForm).toHaveBeenCalledWith('software-engineering');
            });
            expect(toast.success).toHaveBeenCalledWith('Form deleted successfully');
        });

        it('should not delete form when cancelled', async () => {
            vi.spyOn(window, 'confirm').mockReturnValue(false);
            render(<CreditFormManager />);
            await waitFor(() => {
                expect(screen.getByText('Software Engineering')).toBeInTheDocument();
            });

            const deleteButtons = screen.getAllByText('Delete');
            fireEvent.click(deleteButtons[0]);

            expect(deleteCreditForm).not.toHaveBeenCalled();
        });

        it('should show error toast when delete fails', async () => {
            (deleteCreditForm as Mock).mockRejectedValue(new Error('Delete failed'));
            render(<CreditFormManager />);
            await waitFor(() => {
                expect(screen.getByText('Software Engineering')).toBeInTheDocument();
            });

            const deleteButtons = screen.getAllByText('Delete');
            fireEvent.click(deleteButtons[0]);

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('Failed to delete form');
            });
        });
    });



    describe('Generate Program ID', () => {
        it('should generate program ID from title', async () => {
            render(<CreditFormManager />);
            await waitFor(() => {
                expect(screen.getByText('Software Engineering')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Add New Form'));

            // Type a title first
            fireEvent.change(screen.getByLabelText('Title'), {
                target: { value: 'Electrical Engineering' },
            });

            // Click generate button
            fireEvent.click(screen.getByText('Generate'));

            // Program ID should be auto-generated
            expect(screen.getByLabelText('Program ID')).toHaveValue('electrical-engineering');
        });
    });

    describe('File validation', () => {
        it('should show error toast for non-PDF files', async () => {
            render(<CreditFormManager />);
            await waitFor(() => {
                expect(screen.getByText('Software Engineering')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Add New Form'));

            const nonPdfFile = new File(['content'], 'test.txt', { type: 'text/plain' });
            fireEvent.change(screen.getByLabelText(/PDF File/), {
                target: { files: [nonPdfFile] },
            });

            expect(toast.error).toHaveBeenCalledWith('Please select a PDF file');
        });
    });
});
