
import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'node:path';
import { creditFormController } from '@controllers/creditFormController';
import {
    authMiddleware,
    adminCheckMiddleware,
} from '@middleware/authMiddleware';
import HTTP from '@utils/httpCodes';
import {
    creditFormDeleteLimiter,
    creditFormDownloadLimiter,
    creditFormUploadLimiter,
} from '@middleware/rateLimiter';
import { BadRequestError} from '@utils/errors';

const router = express.Router();

// Configure multer for PDF uploads
const UPLOAD_DIR = creditFormController.getUploadDir();

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
        const timestamp = Date.now();
        const safeName = file.originalname.replaceAll(/[^a-zA-Z0-9.-]/g, '_');
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
    const forms = await creditFormController.getAllForms();
    res.status(HTTP.OK).json({ forms });
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
router.get('/file/:filename', creditFormDownloadLimiter, (req: Request, res: Response) => {
    const { filename } = req.params;
    // Strip directory components before resolving (defense-in-depth against path traversal, CWE-22)
    const safeFilename = path.basename(filename as string);
    const filePath = creditFormController.resolveFilePath(safeFilename);

    if (!filePath) {
        res.status(HTTP.NOT_FOUND).json({ error: 'File not found' });
        return;
    }

    // Sanitize the filename for the Content-Disposition header to prevent header injection
    const headerSafeFilename = safeFilename.replaceAll(/["\\\r\n]/g, '');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${headerSafeFilename}"`);
    res.sendFile(filePath);
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
    const { id } = req.params;
    const form = await creditFormController.getFormById(id as string);

    if (!form) {
        res.status(HTTP.NOT_FOUND).json({ error: 'Form not found' });
        return;
    }

    res.status(HTTP.OK).json(form);
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
    creditFormUploadLimiter,
    authMiddleware,
    adminCheckMiddleware,
    handleUpload,
    async (req: Request, res: Response) => {
        const { programId, title, subtitle } = req.body;
        const file = req.file;

        if (!programId || !title || !subtitle) {
            if (file) {
                const fs = await import('node:fs');
                const safeFilename = path.basename(file.path);
                const filePath = path.join(UPLOAD_DIR, safeFilename);
                if (fs.existsSync(filePath)) 
                    fs.unlinkSync(filePath);
            }
            throw new BadRequestError('programId, title, and subtitle are required');
        }

        if (!file) {
            throw new BadRequestError('PDF file is required');
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
    creditFormUploadLimiter,
    authMiddleware,
    adminCheckMiddleware,
    handleUpload,
    async (req: Request, res: Response) => {
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
    creditFormDeleteLimiter,
    authMiddleware,
    adminCheckMiddleware,
    async (req: Request, res: Response) => {
        const { id } = req.params;
        await creditFormController.deleteForm(id as string);
        res.status(HTTP.OK).json({ message: 'Credit form deleted successfully' });
    },
);

export default router;
