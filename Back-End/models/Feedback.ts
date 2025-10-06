import { Schema, model } from 'mongoose';

const FeedbackSchema = new Schema({
  _id: { type: String },
  user: {
    id: { type: String, ref: 'User', default: null },
    fullname: { type: String, default: null }
  },
  message: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now }
});

export const Feedback = model('Feedback', FeedbackSchema);