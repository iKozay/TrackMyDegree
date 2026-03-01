import mongoose from 'mongoose';
import { CreditForm } from '../models/creditForm';

describe('CreditForm Model Test', () => {
    it('create & validate credit form successfully', () => {
        const validForm = new CreditForm({
            programId: 'software-engineering',
            title: 'Software Engineering',
            subtitle: 'BSE Credit count form',
            filename: 'soen.pdf',
            isActive: true,
        });
        const err = validForm.validateSync();
        expect(err).toBeUndefined();

        expect(validForm.programId).toBe('software-engineering');
        expect(validForm.title).toBe('Software Engineering');
        expect(validForm.subtitle).toBe('BSE Credit count form');
        expect(validForm.filename).toBe('soen.pdf');
        expect(validForm.isActive).toBe(true);
        expect(validForm.uploadedAt).toBeDefined();
    });

    it('should fail validation when required fields are missing', () => {
        const formWithoutRequiredField = new CreditForm({ programId: 'test' });
        const err = formWithoutRequiredField.validateSync();

        expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
        expect(err?.errors.title).toBeDefined();
        expect(err?.errors.subtitle).toBeDefined();
        expect(err?.errors.filename).toBeDefined();
    });
});
