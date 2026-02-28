import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import creditFormRoutes from '../routes/creditFormRoutes';
import { creditFormController } from '@controllers/creditFormController';
import HTTP from '../utils/httpCodes';

const MOCK_PDF = 'mock.pdf';
const FILE_PDF = 'pdf';
const FILE_BUFFER = 'mock';
const PROG_ID = 'soen';
const ERR_500 = 'Internal server error';
const ENDPOINT_BASE = '/credit-forms';
const ENDPOINT_FILE = '/credit-forms/file/soen.pdf';
const ENDPOINT_SOEN = '/credit-forms/soen';
const ENDPOINT_123 = '/credit-forms/123';

jest.mock('@controllers/creditFormController', () => ({
    creditFormController: {
        getUploadDir: jest.fn().mockReturnValue('/mock/upload/dir'),
        getAllForms: jest.fn(),
        getFormById: jest.fn(),
        createForm: jest.fn(),
        updateForm: jest.fn(),
        deleteForm: jest.fn(),
        resolveFilePath: jest.fn(),
    }
}));

jest.mock('@middleware/authMiddleware', () => ({
    authMiddleware: jest.fn((req: Request, res: Response, next: NextFunction) => {
        (req as any).user = { userId: '123', role: 'admin' };
        next();
    }),
    adminCheckMiddleware: jest.fn((req: Request, res: Response, next: NextFunction) => next()),
}));

// Mock multer storage configuration so it doesn't fail parsing multipart
jest.mock('multer', () => {
    const multer = () => ({
        single: () => (req: Request, res: Response, next: NextFunction) => {
            console.log('Multer mock executing');
            req.file = {
                fieldname: FILE_PDF,
                originalname: MOCK_PDF,
                encoding: '7bit',
                mimetype: 'application/pdf',
                size: 100,
                destination: '/mock/dir',
                filename: MOCK_PDF,
                path: `/mock/dir/${MOCK_PDF}`
            } as any;
            req.body = {
                programId: PROG_ID,
                title: 'Software Eng',
                subtitle: 'SOEN Form'
            };
            next();
        }
    });
    // @ts-ignore
    multer.diskStorage = jest.fn();
    // @ts-ignore
    multer.MulterError = class MulterError extends Error { };
    return multer;
});

const app = express();
app.use(express.json());
app.use(ENDPOINT_BASE, creditFormRoutes);
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('TEST CAUGHT EXPRESS ERROR:', err);
    res.status(500).json({ error: 'Global error' });
});

describe('creditFormRoutes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('GET /credit-forms should get all active credit forms', async () => {
        const mockForms = [{
            programId: PROG_ID,
            title: 'Software Eng',
            subtitle: 'SOEN Form',
            filename: 'soen.pdf'
        }];
        (creditFormController.getAllForms as jest.Mock).mockResolvedValue(mockForms);

        const res = await request(app).get(ENDPOINT_BASE);

        expect(res.status).toBe(HTTP.OK);
        expect(res.body.forms).toEqual(mockForms);
    });

    it('GET /credit-forms should handle server errors', async () => {
        (creditFormController.getAllForms as jest.Mock).mockRejectedValue(new Error('DB Error'));

        const res = await request(app).get(ENDPOINT_BASE);

        expect(res.status).toBe(HTTP.SERVER_ERR);
        expect(res.body.error).toBe(ERR_500);
    });

    it('GET /credit-forms/file/:filename should serve PDF successfully', async () => {
        const mockPath = '/mock/resolved/path.pdf';
        (creditFormController.resolveFilePath as jest.Mock).mockReturnValue(mockPath);

        // Supertest cannot easily test res.sendFile directly without actual file existence
        // Mocking the res.sendFile on express router is tricky, but we can verify the controller call
        // We will just patch res.sendFile temporarily on the application
        const originalSendFile = express.response.sendFile;
        express.response.sendFile = jest.fn(function (this: any, path: string) {
            this.status(HTTP.OK).send('mock file content');
        });

        const res = await request(app).get(ENDPOINT_FILE);

        expect(creditFormController.resolveFilePath).toHaveBeenCalledWith('soen.pdf');
        expect(res.status).toBe(HTTP.OK);
        expect(res.header['content-type']).toContain('application/pdf');

        express.response.sendFile = originalSendFile;
    });

    it('GET /credit-forms/file/:filename should return 404 if not found', async () => {
        (creditFormController.resolveFilePath as jest.Mock).mockReturnValue(null);

        const res = await request(app).get(ENDPOINT_FILE);

        expect(res.status).toBe(HTTP.NOT_FOUND);
        expect(res.body.error).toBe('File not found');
    });

    it('GET /credit-forms/file/:filename should handle errors', async () => {
        (creditFormController.resolveFilePath as jest.Mock).mockImplementation(() => {
            throw new Error('Error finding file');
        });

        const res = await request(app).get(ENDPOINT_FILE);

        expect(res.status).toBe(HTTP.SERVER_ERR);
        expect(res.body.error).toBe(ERR_500);
    });

    it('GET /credit-forms/:id should return specific form', async () => {
        const mockForm = { id: 'someId', programId: PROG_ID };
        (creditFormController.getFormById as jest.Mock).mockResolvedValue(mockForm);

        const res = await request(app).get(ENDPOINT_SOEN);

        expect(res.status).toBe(HTTP.OK);
        expect(res.body).toEqual(mockForm);
    });

    it('GET /credit-forms/:id should return 404 if not found', async () => {
        (creditFormController.getFormById as jest.Mock).mockResolvedValue(null);

        const res = await request(app).get(ENDPOINT_SOEN);

        expect(res.status).toBe(HTTP.NOT_FOUND);
    });

    it('GET /credit-forms/:id should handle errors', async () => {
        (creditFormController.getFormById as jest.Mock).mockRejectedValue(new Error('err'));

        const res = await request(app).get(ENDPOINT_SOEN);

        expect(res.status).toBe(HTTP.SERVER_ERR);
    });

    it('POST /credit-forms should create form successfully', async () => {
        const mockCreated = { reactivated: false, form: { programId: PROG_ID } };
        (creditFormController.createForm as jest.Mock).mockResolvedValue(mockCreated);

        const res = await request(app).post(ENDPOINT_BASE).attach(FILE_PDF, Buffer.from(FILE_BUFFER), MOCK_PDF);

        expect(res.status).toBe(HTTP.CREATED);
        expect(res.body.message).toBe('Credit form created successfully');
    });

    it('POST /credit-forms should handle CONFLICT errors', async () => {
        (creditFormController.createForm as jest.Mock).mockRejectedValue(new Error('CONFLICT: Form exists'));

        const res = await request(app).post(ENDPOINT_BASE).attach(FILE_PDF, Buffer.from(FILE_BUFFER), MOCK_PDF);

        expect(res.status).toBe(HTTP.CONFLICT);
        expect(res.body.error).toBe('Form exists');
    });

    it('POST /credit-forms should handle generic create errors', async () => {
        (creditFormController.createForm as jest.Mock).mockRejectedValue(new Error('random'));

        const res = await request(app).post(ENDPOINT_BASE).attach(FILE_PDF, Buffer.from(FILE_BUFFER), MOCK_PDF);

        expect(res.status).toBe(HTTP.SERVER_ERR);
    });

    it('PUT /credit-forms/:id should update successfully', async () => {
        const mockForm = { programId: PROG_ID };
        (creditFormController.updateForm as jest.Mock).mockResolvedValue(mockForm);

        const res = await request(app).put(ENDPOINT_123).send({ title: 'New' });

        expect(res.status).toBe(HTTP.OK);
        expect(res.body.form).toEqual(mockForm);
    });

    it('PUT /credit-forms/:id should handle NOT FOUND errors', async () => {
        (creditFormController.updateForm as jest.Mock).mockRejectedValue(new Error('NOT_FOUND: Form not found'));

        const res = await request(app).put(ENDPOINT_123).send({ title: 'New' });

        expect(res.status).toBe(HTTP.NOT_FOUND);
    });

    it('PUT /credit-forms/:id should handle generic error', async () => {
        (creditFormController.updateForm as jest.Mock).mockRejectedValue(new Error('err'));

        const res = await request(app).put(ENDPOINT_123).send({ title: 'New' });

        expect(res.status).toBe(HTTP.SERVER_ERR);
    });

    it('DELETE /credit-forms/:id should delete form successfully', async () => {
        (creditFormController.deleteForm as jest.Mock).mockResolvedValue(true);

        const res = await request(app).delete(ENDPOINT_123);

        expect(res.status).toBe(HTTP.OK);
    });

    it('DELETE /credit-forms/:id should handle NOT FOUND errors', async () => {
        (creditFormController.deleteForm as jest.Mock).mockRejectedValue(new Error('NOT_FOUND: Form not found'));

        const res = await request(app).delete(ENDPOINT_123);

        expect(res.status).toBe(HTTP.NOT_FOUND);
    });

    it('DELETE /credit-forms/:id should handle generic error', async () => {
        (creditFormController.deleteForm as jest.Mock).mockRejectedValue(new Error('err'));

        const res = await request(app).delete(ENDPOINT_123);

        expect(res.status).toBe(HTTP.SERVER_ERR);
    });
});
