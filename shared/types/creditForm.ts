export interface ICreditFormData {
    programId: string;
    title: string;
    subtitle: string;
    pdf: string;
    uploadedAt?: string;
}

export interface CreateCreditFormInput {
    programId: string;
    title: string;
    subtitle: string;
    filename: string;
    uploadedBy: string | null;
}

export interface UpdateCreditFormInput {
    title?: string;
    subtitle?: string;
    filename?: string;
    uploadedBy: string | null;
}
