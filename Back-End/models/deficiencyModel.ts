import { model, Schema, Document } from 'mongoose';
import DeficiencyTypes from '@controllers/deficiencyController/deficiency_types';

// Omit 'id' from DeficiencyTypes.Deficiency to avoid conflict with Document
export interface IDeficiency extends Omit<DeficiencyTypes.Deficiency, 'id'>, Document {
  id: string; // Explicitly declare id as string
}

const DeficiencySchema: Schema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  coursepool: {
    type: String, // In a full setup, this would be: { type: Schema.Types.ObjectId, ref: 'CoursePool' }
    required: true,
  },
  user_id: {
    type: String, // In a full setup, this would be: { type: Schema.Types.ObjectId, ref: 'AppUser' }
    required: true,
  },
  creditsRequired: {
    type: Number,
    required: true,
  },
});

// Create a compound index to ensure the (coursepool, user_id) pair is unique
DeficiencySchema.index({ coursepool: 1, user_id: 1 }, { unique: true });

export default model<IDeficiency>('Deficiency', DeficiencySchema);