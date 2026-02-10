import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { CreditForm, ICreditForm } from '@models/creditForm';
import HTTP from '@utils/httpCodes';
import path from 'node:path';
import fs from 'node:fs';

interface AuthenticatedRequest extends Request {
    user?: {
        userId: string;
        type?: string;
    };
}

const UPLOAD_DIR = path.resolve(__dirname, '../../uploads/credit-forms');
const API_FILE_PREFIX = '/api/credit-forms/file/';
const FORM_NOT_FOUND = 'Form not found';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Get all active credit forms
 */
export async function getAllForms(req: Request, res: Response) {
    try {
        const forms = await CreditForm.find({ isActive: true }).sort({ title: 1 });

        // Map to frontend-compatible format
        const formattedForms = forms.map(form => ({
            id: form.programId,
            title: form.title,
            subtitle: form.subtitle,
            pdf: `${API_FILE_PREFIX}${form.filename}`,
            uploadedAt: form.uploadedAt,
        }));

        res.status(HTTP.OK).json({ forms: formattedForms });
    } catch (error) {
        console.error('Error fetching credit forms:', error);
        res.status(HTTP.SERVER_ERR).json({ error: 'Failed to fetch credit forms' });
    }
}

/**
 * Get a single credit form by programId
 */
export async function getFormById(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const form = await CreditForm.findOne({ programId: id, isActive: true });

        if (!form) {
            return res.status(HTTP.NOT_FOUND).json({ error: FORM_NOT_FOUND });
        }

        res.status(HTTP.OK).json({
            id: form.programId,
            title: form.title,
            subtitle: form.subtitle,
            pdf: `${API_FILE_PREFIX}${form.filename}`,
            uploadedAt: form.uploadedAt,
        });
    } catch (error) {
        console.error('Error fetching credit form:', error);
        res.status(HTTP.SERVER_ERR).json({ error: 'Failed to fetch credit form' });
    }
}

/**
 * Create a new credit form (admin/advisor only)
 * If a soft-deleted form with the same programId exists, it will be reactivated and updated
 */
export async function createForm(req: Request, res: Response) {
    try {
        const { programId, title, subtitle } = req.body;
        const file = req.file;

        if (!programId || !title || !subtitle) {
            return res.status(HTTP.BAD_REQUEST).json({
                error: 'programId, title, and subtitle are required'
            });
        }

        if (!file) {
            return res.status(HTTP.BAD_REQUEST).json({ error: 'PDF file is required' });
        }

        const userId = (req as AuthenticatedRequest).user?.userId;
        const uploadedBy = userId ? new Types.ObjectId(userId) : null;

        // Check for existing form with same programId
        const existing = await CreditForm.findOne({ programId });

        if (existing) {
            if (existing.isActive) {
                // Active form exists - reject the creation
                fs.unlinkSync(file.path);
                return res.status(HTTP.CONFLICT).json({
                    error: 'A form with this program ID already exists. Use the edit function instead.'
                });
            }

            // Form exists but was soft-deleted - reactivate it with new data
            const oldFilePath = path.join(UPLOAD_DIR, existing.filename);
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
            }

            existing.title = title;
            existing.subtitle = subtitle;
            existing.filename = file.filename;
            existing.uploadedBy = uploadedBy;
            existing.uploadedAt = new Date();
            existing.isActive = true;

            await existing.save();

            return res.status(HTTP.CREATED).json({
                message: 'Credit form reactivated and updated successfully',
                form: {
                    id: existing.programId,
                    title: existing.title,
                    subtitle: existing.subtitle,
                    pdf: `${API_FILE_PREFIX}${existing.filename}`,
                },
            });
        }

        // No existing form - create new
        const newForm = new CreditForm({
            programId,
            title,
            subtitle,
            filename: file.filename,
            uploadedBy,
            uploadedAt: new Date(),
            isActive: true,
        });

        await newForm.save();

        res.status(HTTP.CREATED).json({
            message: 'Credit form created successfully',
            form: {
                id: newForm.programId,
                title: newForm.title,
                subtitle: newForm.subtitle,
                pdf: `${API_FILE_PREFIX}${newForm.filename}`,
            },
        });
    } catch (error) {
        console.error('Error creating credit form:', error);
        res.status(HTTP.SERVER_ERR).json({ error: 'Failed to create credit form' });
    }
}

/**
 * Update an existing credit form (admin/advisor only)
 */
export async function updateForm(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { title, subtitle } = req.body;
        const file = req.file;

        const form = await CreditForm.findOne({ programId: id });
        if (!form) {
            if (file) fs.unlinkSync(file.path);
            return res.status(HTTP.NOT_FOUND).json({ error: FORM_NOT_FOUND });
        }

        // Update fields
        if (title) form.title = title;
        if (subtitle) form.subtitle = subtitle;

        // If new file uploaded, delete old file and update
        if (file) {
            const oldFilePath = path.join(UPLOAD_DIR, form.filename);
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
            }
            form.filename = file.filename;
        }

        const userId = (req as AuthenticatedRequest).user?.userId;
        form.uploadedBy = userId ? new Types.ObjectId(userId) : null;
        form.uploadedAt = new Date();

        await form.save();

        res.status(HTTP.OK).json({
            message: 'Credit form updated successfully',
            form: {
                id: form.programId,
                title: form.title,
                subtitle: form.subtitle,
                pdf: `${API_FILE_PREFIX}${form.filename}`,
            },
        });
    } catch (error) {
        console.error('Error updating credit form:', error);
        res.status(HTTP.SERVER_ERR).json({ error: 'Failed to update credit form' });
    }
}

/**
 * Delete a credit form (soft delete - admin/advisor only)
 */
export async function deleteForm(req: Request, res: Response) {
    try {
        const { id } = req.params;

        const form = await CreditForm.findOne({ programId: id });
        if (!form) {
            return res.status(HTTP.NOT_FOUND).json({ error: FORM_NOT_FOUND });
        }

        // Soft delete
        form.isActive = false;
        await form.save();

        res.status(HTTP.OK).json({ message: 'Credit form deleted successfully' });
    } catch (error) {
        console.error('Error deleting credit form:', error);
        res.status(HTTP.SERVER_ERR).json({ error: 'Failed to delete credit form' });
    }
}

/**
 * Serve a PDF file
 */
export async function serveFile(req: Request, res: Response) {
    try {
        const { filename } = req.params;
        const safeFilename = Array.isArray(filename) ? filename[0] : filename;
        const filePath = path.join(UPLOAD_DIR, safeFilename);

        if (!fs.existsSync(filePath)) {
            return res.status(HTTP.NOT_FOUND).json({ error: 'File not found' });
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
        res.sendFile(filePath);
    } catch (error) {
        console.error('Error serving file:', error);
        res.status(HTTP.SERVER_ERR).json({ error: 'Failed to serve file' });
    }
}

/**
 * Migrate existing PDF files from public folder to database (one-time setup)
 * Also copies PDF files from frontend public folder to backend uploads folder
 */
export async function migrateExistingForms() {
    const existingForms = [
        {
            programId: 'software-engineering',
            title: 'Software Engineering',
            subtitle: 'Bachelor of Software Engineering Credit Count Form',
            filename: 'software-engineering.pdf',
        },
        {
            programId: 'computer-science',
            title: 'Computer Science',
            subtitle: 'Bachelor of Computer Science Credit Count Form',
            filename: 'computer-science.pdf',
        },
        {
            programId: 'comp-health-life-science',
            title: 'Computer Science and Health & Life Science',
            subtitle: 'COMP + HLS Double Major Credit Count Form',
            filename: 'cshls-double-major.pdf',
        },
        {
            programId: 'comp-data-science',
            title: 'Computer Science and Data Science',
            subtitle: 'COMP + Data Science Double Major Credit Count Form',
            filename: 'comp-data-science-double-major.pdf',
        },
        {
            programId: 'comp-arts',
            title: 'Computer Science and Computer Arts',
            subtitle: 'COMP + Computer Arts Double Major Credit Count Form',
            filename: 'comp-arts-double-major.pdf',
        },
    ];

    // Source directory where the existing PDFs are located (frontend public folder)
    const SOURCE_DIR = path.resolve(__dirname, '../../../ts-front-end/public/credit-forms');

    let migratedCount = 0;

    for (const formData of existingForms) {
        try {
            // Check if already exists
            const existing = await CreditForm.findOne({ programId: formData.programId });
            if (existing) {
                // Check if file physically exists. If not, try to restore it from source
                const destPath = path.join(UPLOAD_DIR, existing.filename);
                if (!fs.existsSync(destPath) && existing.filename === formData.filename) {
                    const sourcePath = path.join(SOURCE_DIR, formData.filename);
                    if (fs.existsSync(sourcePath)) {
                        fs.copyFileSync(sourcePath, destPath);
                        // eslint-disable-next-line no-console
                        console.log(`Restored missing file for existing form: ${existing.filename}`);
                    }
                } else {
                    // eslint-disable-next-line no-console
                    console.log(`Form ${formData.programId} already exists, skipping migration.`);
                }
                continue;
            }

            // Try to copy the PDF file from the source location
            const sourceFile = path.join(SOURCE_DIR, formData.filename);
            const destFile = path.join(UPLOAD_DIR, formData.filename);

            if (fs.existsSync(sourceFile)) {
                fs.copyFileSync(sourceFile, destFile);
                // eslint-disable-next-line no-console
                console.log(`Copied PDF: ${formData.filename}`);
            } else {
                console.warn(`Source PDF not found: ${sourceFile}, creating database record anyway`);
            }

            // Create the form record
            const newForm = new CreditForm({
                ...formData,
                uploadedBy: null,
                uploadedAt: new Date(),
                isActive: true,
            });

            await newForm.save();
            migratedCount++;
            // eslint-disable-next-line no-console
            console.log(`Migrated form: ${formData.title}`);
        } catch (error) {
            console.error(`Error migrating form ${formData.programId}:`, error);
        }
    }

    // eslint-disable-next-line no-console
    console.log(`Migration complete. ${migratedCount} forms migrated.`);
    return migratedCount;
}

export const creditFormController = {
    getAllForms,
    getFormById,
    createForm,
    updateForm,
    deleteForm,
    serveFile,
    migrateExistingForms,
};
