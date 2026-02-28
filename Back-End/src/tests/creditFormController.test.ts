import * as creditFormController from '@controllers/creditFormController';
import { CreditForm } from '@models/creditForm';
import fs from 'node:fs';

// Mock the CreditForm model
jest.mock('@models/creditForm', () => {
    const mockSave = jest.fn().mockResolvedValue(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const MockCreditFormModel: any = jest.fn().mockImplementation((data: Record<string, unknown>) => ({
        ...data,
        save: mockSave,
    }));
    MockCreditFormModel.find = jest.fn();
    MockCreditFormModel.findOne = jest.fn();
    MockCreditFormModel.findById = jest.fn();
    MockCreditFormModel._mockSave = mockSave;
    return { CreditForm: MockCreditFormModel };
});

// Mock fs module
jest.mock('node:fs', () => ({
    existsSync: jest.fn(),
    unlinkSync: jest.fn(),
    mkdirSync: jest.fn(),
}));

const MOCK_PROGRAM_ID = 'software-engineering';
const MOCK_TITLE = 'Software Engineering';
const MOCK_SUBTITLE = 'Bachelor of Software Engineering Credit Count Form';
const MOCK_FILENAME = 'software-engineering.pdf';
const DB_ERROR = 'Database error';
const TEST_DB_ERROR = 'should handle database errors';
const MOCK_USER_ID = '507f1f77bcf86cd799439012';
const UPDATED_TITLE = 'Updated Title';
const NOT_FOUND_ERR = 'NOT_FOUND:';

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
        it('should return all active forms', async () => {
            const mockForms = [mockForm];
            (CreditForm.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockForms),
            });

            const result = await creditFormController.getAllForms();

            expect(CreditForm.find).toHaveBeenCalledWith({ isActive: true });
            expect(result).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        programId: MOCK_PROGRAM_ID,
                        title: MOCK_TITLE,
                    }),
                ]),
            );
        });

        it('should handle empty forms array', async () => {
            (CreditForm.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockResolvedValue([]),
            });

            const result = await creditFormController.getAllForms();

            expect(result).toEqual([]);
        });

        it(TEST_DB_ERROR, async () => {
            (CreditForm.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockRejectedValue(new Error(DB_ERROR)),
            });

            await expect(creditFormController.getAllForms()).rejects.toThrow(DB_ERROR);
        });
    });

    describe('getFormById', () => {
        it('should return a form by programId', async () => {
            (CreditForm.findOne as jest.Mock).mockResolvedValue(mockForm);

            const result = await creditFormController.getFormById(MOCK_PROGRAM_ID);

            expect(CreditForm.findOne).toHaveBeenCalledWith({
                programId: MOCK_PROGRAM_ID,
                isActive: true,
            });
            expect(result).toEqual(
                expect.objectContaining({
                    programId: MOCK_PROGRAM_ID,
                    title: MOCK_TITLE,
                }),
            );
        });

        it('should return null for non-existent form', async () => {
            (CreditForm.findOne as jest.Mock).mockResolvedValue(null);

            const result = await creditFormController.getFormById('nonexistent');

            expect(result).toBeNull();
        });

        it(TEST_DB_ERROR, async () => {
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

        it('should throw CONFLICT if active form with same programId exists', async () => {
            (CreditForm.findOne as jest.Mock).mockResolvedValue({ ...mockForm, isActive: true });
            (fs.existsSync as jest.Mock).mockReturnValue(true);

            await expect(creditFormController.createForm(createInput)).rejects.toThrow('CONFLICT:');
        });

        it('should reactivate soft-deleted form with same programId', async () => {
            const softDeletedForm = {
                ...mockForm,
                isActive: false,
                save: jest.fn().mockResolvedValue(true),
            };
            (CreditForm.findOne as jest.Mock).mockResolvedValue(softDeletedForm);
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = await creditFormController.createForm(createInput);

            expect(softDeletedForm.isActive).toBe(true);
            expect(softDeletedForm.save).toHaveBeenCalled();
            expect(result.reactivated).toBe(true);
            expect(result.form).toEqual(
                expect.objectContaining({ title: 'New Program' }),
            );
        });

        it('should create new form when programId does not exist', async () => {
            (CreditForm.findOne as jest.Mock).mockResolvedValue(null);

            const result = await creditFormController.createForm(createInput);

            expect(CreditForm).toHaveBeenCalled();
            expect(result.reactivated).toBe(false);
            expect(result.form).toEqual(
                expect.objectContaining({ programId: 'new-program' }),
            );
        });
    });

    describe('updateForm', () => {
        it('should update form successfully', async () => {
            const mockUpdatableForm = {
                ...mockForm,
                save: jest.fn().mockResolvedValue(true),
            };
            (CreditForm.findOne as jest.Mock).mockResolvedValue(mockUpdatableForm);

            const result = await creditFormController.updateForm(MOCK_PROGRAM_ID, {
                title: UPDATED_TITLE,
                uploadedBy: MOCK_USER_ID,
            });

            expect(CreditForm.findOne).toHaveBeenCalledWith({ programId: MOCK_PROGRAM_ID });
            expect(mockUpdatableForm.title).toBe(UPDATED_TITLE);
            expect(mockUpdatableForm.save).toHaveBeenCalled();
            expect(result).toEqual(
                expect.objectContaining({ title: UPDATED_TITLE }),
            );
        });

        it('should throw NOT_FOUND if form not found', async () => {
            (CreditForm.findOne as jest.Mock).mockResolvedValue(null);

            await expect(
                creditFormController.updateForm('nonexistent', {
                    title: UPDATED_TITLE,
                    uploadedBy: MOCK_USER_ID,
                }),
            ).rejects.toThrow(NOT_FOUND_ERR);
        });

        it('should update PDF file if new filename provided', async () => {
            const mockUpdatableForm = {
                ...mockForm,
                save: jest.fn().mockResolvedValue(true),
            };
            (CreditForm.findOne as jest.Mock).mockResolvedValue(mockUpdatableForm);
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.unlinkSync as jest.Mock).mockImplementation(() => { });

            const result = await creditFormController.updateForm(MOCK_PROGRAM_ID, {
                filename: 'updated.pdf',
                uploadedBy: MOCK_USER_ID,
            });

            expect(fs.unlinkSync).toHaveBeenCalled();
            expect(mockUpdatableForm.filename).toBe('updated.pdf');
            expect(result).toBeDefined();
        });

        it('should clean up uploaded file if form not found', async () => {
            (CreditForm.findOne as jest.Mock).mockResolvedValue(null);
            (fs.existsSync as jest.Mock).mockReturnValue(true);

            await expect(
                creditFormController.updateForm('nonexistent', {
                    filename: 'uploaded.pdf',
                    uploadedBy: MOCK_USER_ID,
                }),
            ).rejects.toThrow(NOT_FOUND_ERR);

            expect(fs.unlinkSync).toHaveBeenCalled();
        });

        it(TEST_DB_ERROR, async () => {
            (CreditForm.findOne as jest.Mock).mockRejectedValue(new Error(DB_ERROR));

            await expect(
                creditFormController.updateForm(MOCK_PROGRAM_ID, {
                    title: UPDATED_TITLE,
                    uploadedBy: MOCK_USER_ID,
                }),
            ).rejects.toThrow(DB_ERROR);
        });
    });

    describe('deleteForm', () => {
        it('should soft delete form successfully', async () => {
            const mockFormToDelete = { ...mockForm, save: jest.fn().mockResolvedValue(true) };
            (CreditForm.findOne as jest.Mock).mockResolvedValue(mockFormToDelete);

            await creditFormController.deleteForm(MOCK_PROGRAM_ID);

            expect(CreditForm.findOne).toHaveBeenCalledWith({ programId: MOCK_PROGRAM_ID });
            expect(mockFormToDelete.isActive).toBe(false);
            expect(mockFormToDelete.save).toHaveBeenCalled();
        });

        it('should throw NOT_FOUND if form not found', async () => {
            (CreditForm.findOne as jest.Mock).mockResolvedValue(null);

            await expect(creditFormController.deleteForm('nonexistent')).rejects.toThrow(NOT_FOUND_ERR);
        });

        it(TEST_DB_ERROR, async () => {
            (CreditForm.findOne as jest.Mock).mockRejectedValue(new Error(DB_ERROR));

            await expect(creditFormController.deleteForm(MOCK_PROGRAM_ID)).rejects.toThrow(DB_ERROR);
        });
    });

    describe('resolveFilePath', () => {
        it('should return file path when file exists', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);

            const result = creditFormController.resolveFilePath('test.pdf');

            expect(result).toBeTruthy();
            expect(result).toContain('test.pdf');
        });

        it('should return null when file does not exist', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = creditFormController.resolveFilePath('nonexistent.pdf');

            expect(result).toBeNull();
        });
    });
});
