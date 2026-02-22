import { api } from './http-api-client';
import type { ICreditFormData } from '@shared/creditForm';

export type { ICreditFormData };

interface CreditFormsResponse {
    forms: ICreditFormData[];
}

interface CreditFormResponse {
    message: string;
    form: ICreditFormData;
}

/**
 * Fetch all active credit forms
 */
export async function fetchCreditForms(): Promise<ICreditFormData[]> {
    const response = await api.get<CreditFormsResponse>('/credit-forms');
    return response.forms;
}

/**
 * Fetch a single credit form by ID
 */
export async function fetchCreditFormById(id: string): Promise<ICreditFormData> {
    return api.get<ICreditFormData>(`/credit-forms/${id}`);
}

/**
 * Create a new credit form (admin only)
 */
export async function createCreditForm(
    programId: string,
    title: string,
    subtitle: string,
    pdfFile: File
): Promise<CreditFormResponse> {
    const formData = new FormData();
    formData.append('programId', programId);
    formData.append('title', title);
    formData.append('subtitle', subtitle);
    formData.append('pdf', pdfFile);

    return api.post<CreditFormResponse>('/credit-forms', formData);
}

/**
 * Update an existing credit form (admin only)
 */
export async function updateCreditForm(
    id: string,
    title?: string,
    subtitle?: string,
    pdfFile?: File
): Promise<CreditFormResponse> {
    const formData = new FormData();
    if (title) formData.append('title', title);
    if (subtitle) formData.append('subtitle', subtitle);
    if (pdfFile) formData.append('pdf', pdfFile);

    return api.put<CreditFormResponse>(`/credit-forms/${id}`, formData);
}

/**
 * Delete a credit form (admin only)
 */
export async function deleteCreditForm(id: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/credit-forms/${id}`);
}
