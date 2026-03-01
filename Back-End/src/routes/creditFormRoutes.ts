import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'node:path';
import { creditFormController } from '@controllers/creditFormController';
import {
    authMiddleware,
    adminCheckMiddleware,
} from '@middleware/authMiddleware';
import HTTP from '@utils/httpCodes';

const router = express.Router();

// Configure multer for PDF uploads
const UPLOAD_DIR = creditFormController.getUploadDir();

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
        const timestamp = Date.now();
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `${timestamp}-${safeName}`);
    },
});

// eslint-disable-next-line no-undef
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Only PDF files are allowed'));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
});

// Error handling wrapper for multer
const handleUpload = (req: Request, res: Response, next: NextFunction) => {
    upload.single('pdf')(req, res, (err: any) => {
        if (err instanceof multer.MulterError) {
            console.error('Multer error:', err);
            return res.status(HTTP.BAD_REQUEST).json({ error: `Upload error: ${err.message}` });
        } else if (err) {
            console.error('Upload error:', err);
            return res.status(HTTP.BAD_REQUEST).json({ error: err.message || 'Upload failed' });
        }
        next();
    });
};

const INTERNAL_SERVER_ERROR = 'Internal server error';
const NOT_FOUND_PREFIX = 'NOT_FOUND:';

/**
 * @openapi
 * tags:
 *   - name: CreditForms
 *     description: Credit count form management endpoints
 */

/**
 * @openapi
 * /credit-forms:
 *   get:
 *     summary: Get all active credit forms
 *     tags: [CreditForms]
 *     responses:
 *       200:
 *         description: List of credit forms
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 forms:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       programId:
 *                         type: string
 *                       title:
 *                         type: string
 *                       subtitle:
 *                         type: string
 *                       pdf:
 *                         type: string
 */
router.get('/', async (_req: Request, res: Response) => {
    try {
        const forms = await creditFormController.getAllForms();
        res.status(HTTP.OK).json({ forms });
    } catch (error) {
        console.error('Error in GET /credit-forms', error);
        res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
});

/**
 * @openapi
 * /credit-forms/file/{filename}:
 *   get:
 *     summary: Serve a PDF file
 *     tags: [CreditForms]
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: File not found
 */
// IMPORTANT: This route must be defined BEFORE /:id to prevent 'file' being treated as an id
router.get('/file/:filename', (req: Request, res: Response) => {
    try {
        const { filename } = req.params;
        const filePath = creditFormController.resolveFilePath(filename as string);

        if (!filePath) {
            res.status(HTTP.NOT_FOUND).json({ error: 'File not found' });
            return;
        }

        const safeFilename = Array.isArray(filename) ? filename[0] : filename;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
        res.sendFile(filePath);
    } catch (error) {
        console.error('Error in GET /credit-forms/file/:filename', error);
        res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
});

/**
 * @openapi
 * /credit-forms/{id}:
 *   get:
 *     summary: Get a specific credit form
 *     tags: [CreditForms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Credit form details
 *       404:
 *         description: Form not found
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const form = await creditFormController.getFormById(id as string);

        if (!form) {
            res.status(HTTP.NOT_FOUND).json({ error: 'Form not found' });
            return;
        }

        res.status(HTTP.OK).json(form);
    } catch (error) {
        console.error('Error in GET /credit-forms/:id', error);
        res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
});

/**
 * @openapi
 * /credit-forms:
 *   post:
 *     summary: Create a new credit form (admin only)
 *     tags: [CreditForms]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - programId
 *               - title
 *               - subtitle
 *               - pdf
 *             properties:
 *               programId:
 *                 type: string
 *               title:
 *                 type: string
 *               subtitle:
 *                 type: string
 *               pdf:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Form created successfully
 *       400:
 *         description: Missing required fields or invalid file
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       409:
 *         description: Form with this program ID already exists
 */
router.post(
    '/',
    authMiddleware,
    adminCheckMiddleware,
    handleUpload,
    async (req: Request, res: Response) => {
        try {
            const { programId, title, subtitle } = req.body;
            const file = req.file;

            if (!programId || !title || !subtitle) {
                if (file) {
                    const fs = await import('node:fs');
                    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                }
                res.status(HTTP.BAD_REQUEST).json({
                    error: 'programId, title, and subtitle are required',
                });
                return;
            }

            if (!file) {
                res.status(HTTP.BAD_REQUEST).json({ error: 'PDF file is required' });
                return;
            }

            const userId = (req as any).user?.userId ?? null;

            const result = await creditFormController.createForm({
                programId,
                title,
                subtitle,
                filename: file.filename,
                uploadedBy: userId,
            });

            const message = result.reactivated
                ? 'Credit form reactivated and updated successfully'
                : 'Credit form created successfully';

            res.status(HTTP.CREATED).json({ message, form: result.form });
        } catch (error) {
            if (error instanceof Error && error.message.startsWith('CONFLICT:')) {
                res.status(HTTP.CONFLICT).json({ error: error.message.replace('CONFLICT: ', '') });
            } else {
                console.error('Error in POST /credit-forms', error);
                res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
            }
        }
    },
);

/**
 * @openapi
 * /credit-forms/{id}:
 *   put:
 *     summary: Update a credit form (admin only)
 *     tags: [CreditForms]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               subtitle:
 *                 type: string
 *               pdf:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Form updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Form not found
 */
router.put(
    '/:id',
    authMiddleware,
    adminCheckMiddleware,
    handleUpload,
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { title, subtitle } = req.body;
            const file = req.file;
            const userId = (req as any).user?.userId ?? null;

            const form = await creditFormController.updateForm(id as string, {
                title,
                subtitle,
                filename: file?.filename,
                uploadedBy: userId,
            });

            res.status(HTTP.OK).json({
                message: 'Credit form updated successfully',
                form,
            });
        } catch (error) {
            if (error instanceof Error && error.message.startsWith(NOT_FOUND_PREFIX)) {
                res.status(HTTP.NOT_FOUND).json({ error: error.message.replace(`${NOT_FOUND_PREFIX} `, '') });
            } else {
                console.error('Error in PUT /credit-forms/:id', error);
                res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
            }
        }
    },
);

/**
 * @openapi
 * /credit-forms/{id}:
 *   delete:
 *     summary: Delete a credit form (admin only)
 *     tags: [CreditForms]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Form deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Form not found
 */
router.delete(
    '/:id',
    authMiddleware,
    adminCheckMiddleware,
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            await creditFormController.deleteForm(id as string);
            res.status(HTTP.OK).json({ message: 'Credit form deleted successfully' });
        } catch (error) {
            if (error instanceof Error && error.message.startsWith(NOT_FOUND_PREFIX)) {
                res.status(HTTP.NOT_FOUND).json({ error: error.message.replace(`${NOT_FOUND_PREFIX} `, '') });
            } else {
                console.error('Error in DELETE /credit-forms/:id', error);
                res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
            }
        }
    },
);

export default router;
