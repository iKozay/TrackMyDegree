import { Request, Response } from 'express';
import * as creditFormController from '@controllers/creditFormController';
import { CreditForm } from '@models/creditForm';
import HTTP from '@utils/httpCodes';
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
    copyFileSync: jest.fn(),
}));

const MOCK_PROGRAM_ID = 'software-engineering';
const MOCK_TITLE = 'Software Engineering';
const MOCK_SUBTITLE = 'Bachelor of Software Engineering Credit Count Form';
const MOCK_FILENAME = 'software-engineering.pdf';
const DB_ERROR = 'Database error';
const TEST_DB_ERROR = 'should handle database errors';
const MOCK_USER_ID = '507f1f77bcf86cd799439012';

describe('CreditFormController', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockReq: Partial<Request> & { user?: any };
    let mockRes: Partial<Response>;
    let mockJson: jest.Mock;
    let mockStatus: jest.Mock;
    let mockSetHeader: jest.Mock;

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
        mockJson = jest.fn();
        mockStatus = jest.fn().mockReturnValue({ json: mockJson });
        mockSetHeader = jest.fn();
        mockReq = {
            body: {},
            params: {},
            file: undefined,
            user: { userId: MOCK_USER_ID },
        };
        mockRes = {
            status: mockStatus,
            json: mockJson,
            setHeader: mockSetHeader,
            sendFile: jest.fn(),
        };
        jest.clearAllMocks();
    });

    describe('getAllForms', () => {
        it('should return all active forms', async () => {
            const mockForms = [mockForm];
            (CreditForm.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockForms),
            });

            await creditFormController.getAllForms(mockReq as Request, mockRes as Response);

            expect(CreditForm.find).toHaveBeenCalledWith({ isActive: true });
            expect(mockStatus).toHaveBeenCalledWith(HTTP.OK);
            expect(mockJson).toHaveBeenCalledWith({
                forms: expect.arrayContaining([
                    expect.objectContaining({
                        id: MOCK_PROGRAM_ID,
                        title: MOCK_TITLE,
                    }),
                ]),
            });
        });

        it('should handle empty forms array', async () => {
            (CreditForm.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockResolvedValue([]),
            });

            await creditFormController.getAllForms(mockReq as Request, mockRes as Response);

            expect(mockStatus).toHaveBeenCalledWith(HTTP.OK);
            expect(mockJson).toHaveBeenCalledWith({ forms: [] });
        });

        it(TEST_DB_ERROR, async () => {
            (CreditForm.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockRejectedValue(new Error(DB_ERROR)),
            });

            await creditFormController.getAllForms(mockReq as Request, mockRes as Response);

            expect(mockStatus).toHaveBeenCalledWith(HTTP.SERVER_ERR);
            expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to fetch credit forms' });
        });
    });

    describe('getFormById', () => {
        it('should return a form by id', async () => {
            mockReq.params = { id: MOCK_PROGRAM_ID };
            (CreditForm.findOne as jest.Mock).mockResolvedValue(mockForm);

            await creditFormController.getFormById(mockReq as Request, mockRes as Response);

            expect(CreditForm.findOne).toHaveBeenCalledWith({
                programId: MOCK_PROGRAM_ID,
                isActive: true, // This was already here?
            });
            expect(mockStatus).toHaveBeenCalledWith(HTTP.OK);
        });

        it('should return 404 for non-existent form', async () => {
            mockReq.params = { id: 'nonexistent' };
            (CreditForm.findOne as jest.Mock).mockResolvedValue(null);

            await creditFormController.getFormById(mockReq as Request, mockRes as Response);

            expect(mockStatus).toHaveBeenCalledWith(HTTP.NOT_FOUND);
            expect(mockJson).toHaveBeenCalledWith({ error: 'Form not found' });
        });

        it(TEST_DB_ERROR, async () => {
            mockReq.params = { id: MOCK_PROGRAM_ID };
            (CreditForm.findOne as jest.Mock).mockRejectedValue(new Error(DB_ERROR));

            await creditFormController.getFormById(mockReq as Request, mockRes as Response);

            expect(mockStatus).toHaveBeenCalledWith(HTTP.SERVER_ERR);
        });
    });

    describe('createForm', () => {
        beforeEach(() => {
            mockReq.body = {
                programId: 'new-program',
                title: 'New Program',
                subtitle: 'New Program Credit Count Form',
            };
            mockReq.file = {
                filename: 'new-program.pdf',
                path: '/tmp/new-program.pdf',
                // eslint-disable-next-line no-undef
            } as Express.Multer.File;
        });

        it('should return 400 if programId is missing', async () => {
            mockReq.body = { title: 'Test', subtitle: 'Test' };

            await creditFormController.createForm(mockReq as Request, mockRes as Response);

            expect(mockStatus).toHaveBeenCalledWith(HTTP.BAD_REQUEST);
            expect(mockJson).toHaveBeenCalledWith({
                error: 'programId, title, and subtitle are required',
            });
        });

        it('should return 400 if file is missing', async () => {
            mockReq.file = undefined;

            await creditFormController.createForm(mockReq as Request, mockRes as Response);

            expect(mockStatus).toHaveBeenCalledWith(HTTP.BAD_REQUEST);
            expect(mockJson).toHaveBeenCalledWith({ error: 'PDF file is required' });
        });

        it('should return 409 if active form with same programId exists', async () => {
            (CreditForm.findOne as jest.Mock).mockResolvedValue({ ...mockForm, isActive: true });
            (fs.unlinkSync as jest.Mock).mockImplementation(() => { });

            await creditFormController.createForm(mockReq as Request, mockRes as Response);

            expect(mockStatus).toHaveBeenCalledWith(HTTP.CONFLICT);
            expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/new-program.pdf');
        });

        it('should reactivate soft-deleted form with same programId', async () => {
            const softDeletedForm = {
                ...mockForm,
                isActive: false,
                save: jest.fn().mockResolvedValue(true),
            };
            (CreditForm.findOne as jest.Mock).mockResolvedValue(softDeletedForm);
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            await creditFormController.createForm(mockReq as Request, mockRes as Response);

            expect(softDeletedForm.isActive).toBe(true);
            expect(softDeletedForm.save).toHaveBeenCalled();
            expect(mockStatus).toHaveBeenCalledWith(HTTP.CREATED);
        });

        it('should create new form when programId does not exist', async () => {
            (CreditForm.findOne as jest.Mock).mockResolvedValue(null);

            await creditFormController.createForm(mockReq as Request, mockRes as Response);

            expect(CreditForm).toHaveBeenCalled();
            expect(mockStatus).toHaveBeenCalledWith(HTTP.CREATED);
        });
    });

    describe('updateForm', () => {
        beforeEach(() => {
            mockReq.params = { id: MOCK_PROGRAM_ID };
            mockReq.body = { title: 'Updated Title' };
        });

        it('should update form successfully', async () => {
            const mockUpdatableForm = {
                ...mockForm,
                save: jest.fn().mockResolvedValue(true),
            };
            (CreditForm.findOne as jest.Mock).mockResolvedValue(mockUpdatableForm);

            await creditFormController.updateForm(mockReq as Request, mockRes as Response);

            expect(CreditForm.findOne).toHaveBeenCalledWith({ programId: MOCK_PROGRAM_ID });
            expect(mockUpdatableForm.title).toBe('Updated Title');
            expect(mockUpdatableForm.save).toHaveBeenCalled();
            expect(mockStatus).toHaveBeenCalledWith(HTTP.OK);
        });

        it('should return 404 if form not found', async () => {
            mockReq.params = { id: 'nonexistent' };
            (CreditForm.findOne as jest.Mock).mockResolvedValue(null);

            await creditFormController.updateForm(mockReq as Request, mockRes as Response);

            expect(mockStatus).toHaveBeenCalledWith(HTTP.NOT_FOUND);
        });

        it('should update PDF file if new file provided', async () => {
            mockReq.file = {
                filename: 'updated.pdf',
                path: '/tmp/updated.pdf',
                // eslint-disable-next-line no-undef
            } as Express.Multer.File;
            const mockUpdatableForm = {
                ...mockForm,
                save: jest.fn().mockResolvedValue(true),
            };
            (CreditForm.findOne as jest.Mock).mockResolvedValue(mockUpdatableForm);
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.unlinkSync as jest.Mock).mockImplementation(() => { });

            await creditFormController.updateForm(mockReq as Request, mockRes as Response);

            expect(fs.unlinkSync).toHaveBeenCalled();
            expect(mockUpdatableForm.filename).toBe('updated.pdf');
        });

        it('should clean up uploaded file if form not found', async () => {
            mockReq.params = { id: 'nonexistent' };
            mockReq.file = {
                filename: 'uploaded.pdf',
                path: '/tmp/uploaded.pdf',
                // eslint-disable-next-line no-undef
            } as Express.Multer.File;
            (CreditForm.findOne as jest.Mock).mockResolvedValue(null);

            await creditFormController.updateForm(mockReq as Request, mockRes as Response);

            expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/uploaded.pdf');
            expect(mockStatus).toHaveBeenCalledWith(HTTP.NOT_FOUND);
        });

        it(TEST_DB_ERROR, async () => {
            (CreditForm.findOne as jest.Mock).mockRejectedValue(new Error(DB_ERROR));

            await creditFormController.updateForm(mockReq as Request, mockRes as Response);

            expect(mockStatus).toHaveBeenCalledWith(HTTP.SERVER_ERR);
        });
    });

    describe('deleteForm', () => {
        beforeEach(() => {
            mockReq.params = { id: MOCK_PROGRAM_ID };
        });

        it('should soft delete form successfully', async () => {
            const mockFormToDelete = { ...mockForm, save: jest.fn().mockResolvedValue(true) };
            (CreditForm.findOne as jest.Mock).mockResolvedValue(mockFormToDelete);

            await creditFormController.deleteForm(mockReq as Request, mockRes as Response);

            expect(CreditForm.findOne).toHaveBeenCalledWith({ programId: MOCK_PROGRAM_ID });
            expect(mockFormToDelete.isActive).toBe(false);
            expect(mockFormToDelete.save).toHaveBeenCalled();
            expect(mockStatus).toHaveBeenCalledWith(HTTP.OK);
        });

        it('should return 404 if form not found', async () => {
            (CreditForm.findOne as jest.Mock).mockResolvedValue(null);

            await creditFormController.deleteForm(mockReq as Request, mockRes as Response);

            expect(mockStatus).toHaveBeenCalledWith(HTTP.NOT_FOUND);
        });

        it(TEST_DB_ERROR, async () => {
            (CreditForm.findOne as jest.Mock).mockRejectedValue(new Error(DB_ERROR));

            await creditFormController.deleteForm(mockReq as Request, mockRes as Response);

            expect(mockStatus).toHaveBeenCalledWith(HTTP.SERVER_ERR);
        });
    });

    describe('serveFile', () => {
        beforeEach(() => {
            mockReq.params = { filename: 'test.pdf' };
        });

        it('should serve file when it exists', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);

            await creditFormController.serveFile(mockReq as Request, mockRes as Response);

            expect(mockSetHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
            expect(mockSetHeader).toHaveBeenCalledWith(
                'Content-Disposition',
                'inline; filename="test.pdf"'
            );
            expect(mockRes.sendFile).toHaveBeenCalled();
        });

        it('should return 404 when file does not exist', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            await creditFormController.serveFile(mockReq as Request, mockRes as Response);

            expect(mockStatus).toHaveBeenCalledWith(HTTP.NOT_FOUND);
            expect(mockJson).toHaveBeenCalledWith({ error: 'File not found' });
        });

        it('should handle array filename param', async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockReq.params = { filename: ['file1.pdf', 'file2.pdf'] as any };
            (fs.existsSync as jest.Mock).mockReturnValue(true);

            await creditFormController.serveFile(mockReq as Request, mockRes as Response);

            expect(mockSetHeader).toHaveBeenCalledWith(
                'Content-Disposition',
                'inline; filename="file1.pdf"'
            );
            expect(mockRes.sendFile).toHaveBeenCalled();
        });
    });

    describe('migrateExistingForms', () => {
        it('should migrate forms that do not exist', async () => {
            (CreditForm.findOne as jest.Mock).mockResolvedValue(null);
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = await creditFormController.migrateExistingForms();

            expect(typeof result).toBe('number');
            expect(result).toBeGreaterThanOrEqual(0);
        });

        it('should restore missing file for existing form', async () => {
            (CreditForm.findOne as jest.Mock).mockResolvedValue(mockForm);
            (fs.existsSync as jest.Mock).mockImplementation((pathStr: string) => {
                // Return true for source files (in public/credit-forms), false for dest files (in uploads)
                return pathStr.includes('public') && pathStr.endsWith('.pdf');
            });

            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            await creditFormController.migrateExistingForms();

            // Should copy file and log restoration
            expect(fs.copyFileSync).toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Restored missing file'));
            consoleSpy.mockRestore();
        });

        it('should skip forms if both record and file exist', async () => {
            (CreditForm.findOne as jest.Mock).mockResolvedValue(mockForm);
            (fs.existsSync as jest.Mock).mockReturnValue(true);

            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            await creditFormController.migrateExistingForms();

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('already exists'));
            expect(fs.copyFileSync).not.toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should copy PDF files when source exists', async () => {
            (CreditForm.findOne as jest.Mock).mockResolvedValue(null);
            (fs.existsSync as jest.Mock).mockReturnValue(true);

            await creditFormController.migrateExistingForms();

            expect(fs.copyFileSync).toHaveBeenCalled();
        });
    });
});
