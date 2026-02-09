import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { creditFormController } from '@controllers/creditFormController';
import { advisorOrAdminMiddleware } from '@middleware/advisorMiddleware';
import HTTP from '@utils/httpCodes';

const router = express.Router();

// Configure multer for PDF uploads
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads/credit-forms');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log('Created upload directory:', UPLOAD_DIR);
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
        // Use timestamp + original name to avoid conflicts
        const timestamp = Date.now();
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `${timestamp}-${safeName}`);
    },
});

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
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       subtitle:
 *                         type: string
 *                       pdf:
 *                         type: string
 */
router.get('/', creditFormController.getAllForms);

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
router.get('/file/:filename', creditFormController.serveFile);

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
router.get('/:id', creditFormController.getFormById);

/**
 * @openapi
 * /credit-forms:
 *   post:
 *     summary: Create a new credit form (admin/advisor only)
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
 *         description: Forbidden - admin/advisor only
 *       409:
 *         description: Form with this program ID already exists
 */
router.post(
    '/',
    advisorOrAdminMiddleware,
    handleUpload,
    creditFormController.createForm
);

/**
 * @openapi
 * /credit-forms/{id}:
 *   put:
 *     summary: Update a credit form (admin/advisor only)
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
    advisorOrAdminMiddleware,
    handleUpload,
    creditFormController.updateForm
);

/**
 * @openapi
 * /credit-forms/{id}:
 *   delete:
 *     summary: Delete a credit form (admin/advisor only)
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
router.delete('/:id', advisorOrAdminMiddleware, creditFormController.deleteForm);

/**
 * @openapi
 * /credit-forms/migrate:
 *   post:
 *     summary: Migrate existing PDF forms to database (admin only, one-time setup)
 *     tags: [CreditForms]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Migration complete
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/migrate', advisorOrAdminMiddleware, async (_req: Request, res: Response) => {
    try {
        const count = await creditFormController.migrateExistingForms();
        res.status(HTTP.OK).json({
            message: 'Migration complete',
            migratedCount: count
        });
    } catch (error) {
        console.error('Error during migration:', error);
        res.status(HTTP.SERVER_ERR).json({ error: 'Migration failed' });
    }
});

export default router;
