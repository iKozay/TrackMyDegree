import { Schema, model } from 'mongoose';

const FeedbackSchema = new Schema(
  // _id is automatically created by MongoDB
  {
    user_id: { type: String, ref: 'User', default: null }, // Allows anonymous feedback
    message: { type: String, required: true },
  },
  { timestamps: { createdAt: 'submitted_at' } },
); // Automatically adds submitted_at

export const Feedback = model('Feedback', FeedbackSchema);
