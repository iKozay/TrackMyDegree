/* eslint-disable sonarjs/no-duplicate-string */
import * as creditFormController from '@controllers/creditFormController';
import { CreditForm } from '@models/creditForm';
import fs from 'node:fs';
import path from 'node:path';
import { AlreadyExistsError, NotFoundError } from '@utils/errors';

jest.mock('@models/creditForm', () => {
    const mockSave = jest.fn().mockResolvedValue(true);
    const MockCreditFormModel: any = jest.fn().mockImplementation((data: Record<string, unknown>) => ({
        ...data,
        save: mockSave,
    }));
    MockCreditFormModel.find = jest.fn();
    MockCreditFormModel.findOne = jest.fn();
    MockCreditFormModel._mockSave = mockSave;
    return { CreditForm: MockCreditFormModel };
});

jest.mock('node:fs', () => ({
    existsSync: jest.fn(),
    unlinkSync: jest.fn(),
    mkdirSync: jest.fn(),
}));

const MOCK_PROGRAM_ID = 'software-engineering';
const MOCK_TITLE = 'Software Engineering';
const MOCK_SUBTITLE = 'Bachelor of Software Engineering Credit Count Form';
const MOCK_FILENAME = 'software-engineering.pdf';
const MOCK_USER_ID = '507f1f77bcf86cd799439012';
const UPDATED_TITLE = 'Updated Title';
const DB_ERROR = 'Database error';

describe('CreditFormController', () => {
    const mockForm = {
        _id: '507f1f77bcf86cd799439011',
        programId: MOCK_PROGRAM_ID,
        title: MOCK_TITLE,
        subtitle: MOCK_SUBTITLE,
        filename: MOCK_FILENAME,
        uploadedBy: MOCK_USER_ID,
        uploadedAt: new Date('2024-01-01'),
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getAllForms', () => {
        it('returns all active forms', async () => {
            (CreditForm.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockResolvedValue([mockForm]),
            });

            const result = await creditFormController.getAllForms();

            expect(CreditForm.find).toHaveBeenCalledWith({ isActive: true });
            expect(result[0].programId).toBe(MOCK_PROGRAM_ID);
            expect(result[0].pdf).toContain('api/credit-forms/file');
        });

        it('handles empty array', async () => {
            (CreditForm.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockResolvedValue([]),
            });

            const result = await creditFormController.getAllForms();
            expect(result).toEqual([]);
        });

        it('throws on DB error', async () => {
            (CreditForm.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockRejectedValue(new Error(DB_ERROR)),
            });

            await expect(creditFormController.getAllForms()).rejects.toThrow(DB_ERROR);
        });
    });

    describe('getFormById', () => {
        it('returns form by programId', async () => {
            (CreditForm.findOne as jest.Mock).mockResolvedValue(mockForm);

            const result = await creditFormController.getFormById(MOCK_PROGRAM_ID);

            expect(result?.programId).toBe(MOCK_PROGRAM_ID);
            expect(result?.pdf).toContain('api/credit-forms/file');
        });

        it('throws NotFoundError if not found', async () => {
            (CreditForm.findOne as jest.Mock).mockResolvedValue(null);

            await expect(creditFormController.getFormById('nonexistent')).rejects.toThrow(NotFoundError);
        });

        it('throws on DB error', async () => {
            (CreditForm.findOne as jest.Mock).mockRejectedValue(new Error(DB_ERROR));

            await expect(creditFormController.getFormById(MOCK_PROGRAM_ID)).rejects.toThrow(DB_ERROR);
        });
    });

    describe('createForm', () => {
        const createInput = {
            programId: 'new-program',
            title: 'New Program',
            subtitle: 'New Program Credit Count Form',
            filename: 'new-program.pdf',
            uploadedBy: MOCK_USER_ID,
        };

        it('throws AlreadyExistsError if active form exists', async () => {
            (CreditForm.findOne as jest.Mock).mockResolvedValue({ ...mockForm, isActive: true });
            (fs.existsSync as jest.Mock).mockReturnValue(true);

            await expect(creditFormController.createForm(createInput)).rejects.toThrow(AlreadyExistsError);
            expect(fs.unlinkSync).toHaveBeenCalled();
        });

        it('reactivates soft-deleted form', async () => {
            const softDeletedForm = { ...mockForm, isActive: false, save: jest.fn().mockResolvedValue(true) };
            (CreditForm.findOne as jest.Mock).mockResolvedValue(softDeletedForm);
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = await creditFormController.createForm(createInput);

            expect(softDeletedForm.isActive).toBe(true);
            expect(softDeletedForm.save).toHaveBeenCalled();
            expect(result.reactivated).toBe(true);
            expect(result.form.title).toBe('New Program');
        });

        it('creates new form if none exists', async () => {
            (CreditForm.findOne as jest.Mock).mockResolvedValue(null);

            const result = await creditFormController.createForm(createInput);

            expect(CreditForm).toHaveBeenCalled();
            expect(result.reactivated).toBe(false);
        });
    });

    describe('updateForm', () => {
        it('updates form successfully', async () => {
            const updatableForm = { ...mockForm, save: jest.fn().mockResolvedValue(true) };
            (CreditForm.findOne as jest.Mock).mockResolvedValue(updatableForm);

            const result = await creditFormController.updateForm(MOCK_PROGRAM_ID, {
                title: UPDATED_TITLE,
                uploadedBy: MOCK_USER_ID,
            });

            expect(updatableForm.title).toBe(UPDATED_TITLE);
            expect(updatableForm.save).toHaveBeenCalled();
            expect(result.title).toBe(UPDATED_TITLE);
        });

        it('updates PDF file and deletes old file', async () => {
            const updatableForm = { ...mockForm, save: jest.fn().mockResolvedValue(true) };
            (CreditForm.findOne as jest.Mock).mockResolvedValue(updatableForm);
            (fs.existsSync as jest.Mock).mockReturnValue(true);

            const result = await creditFormController.updateForm(MOCK_PROGRAM_ID, {
                filename: 'updated.pdf',
                uploadedBy: MOCK_USER_ID,
            });

            expect(updatableForm.filename).toBe('updated.pdf');
            expect(fs.unlinkSync).toHaveBeenCalled();
            expect(result.pdf).toContain('updated.pdf');
        });

        it('throws NotFoundError and cleans up uploaded file if form missing', async () => {
            (CreditForm.findOne as jest.Mock).mockResolvedValue(null);
            (fs.existsSync as jest.Mock).mockReturnValue(true);

            await expect(
                creditFormController.updateForm('nonexistent', { filename: 'upload.pdf', uploadedBy: MOCK_USER_ID })
            ).rejects.toThrow(NotFoundError);

            expect(fs.unlinkSync).toHaveBeenCalled();
        });

        it('throws on DB error', async () => {
            (CreditForm.findOne as jest.Mock).mockRejectedValue(new Error(DB_ERROR));

            await expect(
                creditFormController.updateForm(MOCK_PROGRAM_ID, { title: UPDATED_TITLE, uploadedBy: MOCK_USER_ID })
            ).rejects.toThrow(DB_ERROR);
        });
    });

    describe('deleteForm', () => {
        it('soft deletes form', async () => {
            const formToDelete = { ...mockForm, save: jest.fn().mockResolvedValue(true) };
            (CreditForm.findOne as jest.Mock).mockResolvedValue(formToDelete);

            await creditFormController.deleteForm(MOCK_PROGRAM_ID);

            expect(formToDelete.isActive).toBe(false);
            expect(formToDelete.save).toHaveBeenCalled();
        });

        it('throws NotFoundError if form not found', async () => {
            (CreditForm.findOne as jest.Mock).mockResolvedValue(null);
            await expect(creditFormController.deleteForm('nonexistent')).rejects.toThrow(NotFoundError);
        });

        it('throws on DB error', async () => {
            (CreditForm.findOne as jest.Mock).mockRejectedValue(new Error(DB_ERROR));
            await expect(creditFormController.deleteForm(MOCK_PROGRAM_ID)).rejects.toThrow(DB_ERROR);
        });
    });

    describe('resolveFilePath', () => {
        it('returns safe file path if exists', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);

            const filePath = creditFormController.resolveFilePath('file.pdf');
            expect(filePath).toContain('file.pdf');
        });

        it('throws NotFoundError if file missing', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);
            expect(() => creditFormController.resolveFilePath('missing.pdf')).toThrow(NotFoundError);
        });

       it('throws NotFoundError for path traversal attempt', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    // Mock path.resolve to simulate traversal outside upload dir
    jest.spyOn(path, 'resolve').mockImplementation((...paths) => '/etc/passwd');

    expect(() => creditFormController.resolveFilePath('../../etc/passwd')).toThrow(NotFoundError);

    (path.resolve as jest.Mock).mockRestore();
});
    });
});