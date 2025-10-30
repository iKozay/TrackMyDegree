import { Schema, model } from 'mongoose';

const CoursePoolSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  creditsRequired: { type: Number, required: true },
  courses: [{ type: String, ref: 'Course' }],
});

const DegreeSchema = new Schema({
  // _id is automatically created by MongoDB
  name: { type: String, required: true, unique: true },
  totalCredits: { type: Number, required: true },
  isAddon: { type: Boolean, default: false },
  coursePools: [CoursePoolSchema],
  isECP: { type: Boolean, default: false },
});

export const Degree = model('Degree', DegreeSchema);
