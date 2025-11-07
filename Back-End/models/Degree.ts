import { Schema, model } from 'mongoose';

const DegreeSchema = new Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true, unique: true },
  totalCredits: { type: Number, required: true },
  isAddon: { type: Boolean, default: false },
  coursePools: [{ type: String, ref: 'CoursePool' }],
});

export const Degree = model('Degree', DegreeSchema);
