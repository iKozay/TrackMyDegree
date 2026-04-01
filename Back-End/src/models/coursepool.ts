import { Schema, model } from 'mongoose';
import { RuleSchema } from './rule';

const DEFAULT_BASE_ACADEMIC_YEAR = '2025-2026';

const CoursePoolSchema = new Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  creditsRequired: { type: Number, required: true },
  courses: [{ type: String, ref: 'Course' }],
  rules: { type: [RuleSchema], default: [] },
  baseAcademicYear: {
    type: String,
    required: true,
    default: DEFAULT_BASE_ACADEMIC_YEAR,
  },
});

export const CoursePool = model('CoursePool', CoursePoolSchema);
