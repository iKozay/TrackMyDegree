import { Schema, model } from 'mongoose';

const FeedbackSchema = new Schema({
  user_id: { type: String, ref: 'User', required: true },
  message: { type: String, required: true },
}, { timestamps: { createdAt: 'submitted_at' } }); // Automatically adds submitted_at

export const Feedback = model('Feedback', FeedbackSchema);