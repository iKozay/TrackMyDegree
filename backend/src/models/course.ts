import { Schema, model } from 'mongoose';
import { RuleSchema } from './rule';

const DEFAULT_BASE_ACADEMIC_YEAR = '2025-2026';

const CourseSchema = new Schema({
  _id: { type: String }, // course code ex: 'SOEN 490'
  title: { type: String, required: true },
  credits: { type: Number, required: true },
  description: { type: String, required: true },
  offeredIn: [{ type: String }], // e.g., ['fall', 'winter']
  prereqCoreqText: { type: String }, // textual representation
  rules: { type: [RuleSchema], default: [] },
  notes: { type: String },
  components: [{ type: String }],
  baseAcademicYear: {
    type: String,
    required: true,
    default: DEFAULT_BASE_ACADEMIC_YEAR,
  },
});

export const Course = model('Course', CourseSchema);
