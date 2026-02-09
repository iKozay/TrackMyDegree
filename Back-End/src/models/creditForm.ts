import { Schema, model, Types } from 'mongoose';

export interface ICreditForm {
    _id?: Types.ObjectId;
    programId: string;        // e.g., "software-engineering"
    title: string;            // e.g., "Software Engineering"
    subtitle: string;         // e.g., "Bachelor of Software Engineering Credit Count Form"
    filename: string;         // e.g., "software-engineering.pdf"
    uploadedBy: Types.ObjectId | null;
    uploadedAt: Date;
    isActive: boolean;
}

const CreditFormSchema = new Schema<ICreditForm>({
    programId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    subtitle: { type: String, required: true },
    filename: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    uploadedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
});

export const CreditForm = model<ICreditForm>('CreditForm', CreditFormSchema);
