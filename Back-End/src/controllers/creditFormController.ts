import { Types } from 'mongoose';
import { CreditForm } from '@models/creditForm';
import { ICreditFormData, CreateCreditFormInput, UpdateCreditFormInput } from '@shared/creditForm';
import path from 'node:path';
import fs from 'node:fs';

const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../../data');
const UPLOAD_DIR = path.join(DATA_DIR, 'credit-forms');
const API_FILE_PREFIX = '/api/credit-forms/file/';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Get the upload directory path
 */
export function getUploadDir(): string {
    return UPLOAD_DIR;
}

/**
 * Get all active credit forms
 */
export async function getAllForms(): Promise<ICreditFormData[]> {
    const forms = await CreditForm.find({ isActive: true }).sort({ title: 1 });

    return forms.map(form => ({
        programId: form.programId,
        title: form.title,
        subtitle: form.subtitle,
        pdf: `${API_FILE_PREFIX}${form.filename}`,
        uploadedAt: form.uploadedAt?.toISOString(),
    }));
}

/**
 * Get a single credit form by programId
 */
export async function getFormById(programId: string): Promise<ICreditFormData | null> {
    const form = await CreditForm.findOne({ programId, isActive: true });

    if (!form) {
        return null;
    }

    return {
        programId: form.programId,
        title: form.title,
        subtitle: form.subtitle,
        pdf: `${API_FILE_PREFIX}${form.filename}`,
        uploadedAt: form.uploadedAt?.toISOString(),
    };
}

/**
 * Create a new credit form (admin only)
 * If a soft-deleted form with the same programId exists, it will be reactivated and updated
 * Returns { form, reactivated } on success
 * Throws an error if an active form with the same programId exists
 */
export async function createForm(
    input: CreateCreditFormInput,
): Promise<{ form: ICreditFormData; reactivated: boolean }> {
    const { programId, title, subtitle, filename, uploadedBy } = input;
    const uploadedByOid = uploadedBy ? new Types.ObjectId(uploadedBy) : null;

    // Check for existing form with same programId
    const existing = await CreditForm.findOne({ programId });

    if (existing) {
        if (existing.isActive) {
            // Clean up the uploaded file since we're rejecting
            const filePath = path.join(UPLOAD_DIR, filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            throw new Error('CONFLICT: A form with this program ID already exists. Use the edit function instead.');
        }

        // Form exists but was soft-deleted — reactivate it with new data
        const oldFilePath = path.join(UPLOAD_DIR, existing.filename);
        if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
        }

        existing.title = title;
        existing.subtitle = subtitle;
        existing.filename = filename;
        existing.uploadedBy = uploadedByOid;
        existing.uploadedAt = new Date();
        existing.isActive = true;

        await existing.save();

        return {
            form: {
                programId: existing.programId,
                title: existing.title,
                subtitle: existing.subtitle,
                pdf: `${API_FILE_PREFIX}${existing.filename}`,
            },
            reactivated: true,
        };
    }

    // No existing form — create new
    const newForm = new CreditForm({
        programId,
        title,
        subtitle,
        filename,
        uploadedBy: uploadedByOid,
        uploadedAt: new Date(),
        isActive: true,
    });

    await newForm.save();

    return {
        form: {
            programId: newForm.programId,
            title: newForm.title,
            subtitle: newForm.subtitle,
            pdf: `${API_FILE_PREFIX}${newForm.filename}`,
        },
        reactivated: false,
    };
}

/**
 * Update an existing credit form (admin only)
 * Throws if the form is not found
 */
export async function updateForm(
    programId: string,
    input: UpdateCreditFormInput,
): Promise<ICreditFormData> {
    const form = await CreditForm.findOne({ programId });
    if (!form) {
        // Clean up the uploaded file if one was provided
        if (input.filename) {
            const filePath = path.join(UPLOAD_DIR, input.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        throw new Error('NOT_FOUND: Form not found');
    }

    if (input.title) form.title = input.title;
    if (input.subtitle) form.subtitle = input.subtitle;

    // If new file uploaded, delete old file and update
    if (input.filename) {
        const oldFilePath = path.join(UPLOAD_DIR, form.filename);
        if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
        }
        form.filename = input.filename;
    }

    form.uploadedBy = input.uploadedBy ? new Types.ObjectId(input.uploadedBy) : null;
    form.uploadedAt = new Date();

    await form.save();

    return {
        programId: form.programId,
        title: form.title,
        subtitle: form.subtitle,
        pdf: `${API_FILE_PREFIX}${form.filename}`,
    };
}

/**
 * Delete a credit form (soft delete — admin only)
 * Throws if the form is not found
 */
export async function deleteForm(programId: string): Promise<void> {
    const form = await CreditForm.findOne({ programId });
    if (!form) {
        throw new Error('NOT_FOUND: Form not found');
    }

    form.isActive = false;
    await form.save();
}

/**
 * Resolve the absolute path for a given PDF filename.
 * Returns null if the file does not exist on disk.
 */
export function resolveFilePath(filename: string): string | null {
    const safeFilename = Array.isArray(filename) ? filename[0] : filename;
    const filePath = path.join(UPLOAD_DIR, safeFilename);
    return fs.existsSync(filePath) ? filePath : null;
}

export const creditFormController = {
    getAllForms,
    getFormById,
    createForm,
    updateForm,
    deleteForm,
    resolveFilePath,
    getUploadDir,
};
