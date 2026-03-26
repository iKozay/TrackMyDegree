import { Schema, model } from 'mongoose';

const DEFAULT_BASE_ACADEMIC_YEAR = '2025-2026';

const CourseSchema = new Schema({
  _id: { type: String }, // course code ex: 'SOEN 490'
  title: { type: String, required: true },
  credits: { type: Number, required: true },
  description: { type: String, required: true },
  offeredIn: [{ type: String }], // e.g., ['fall', 'winter']
  prereqCoreqText: { type: String }, // textual representation
  rules: {
    prereq: [[{ type: String, ref: 'Course' }]],
    coreq: [[{ type: String, ref: 'Course' }]],
    not_taken: [{ type: String, ref: 'Course' }],
    min_credits: { type: Number, default: 0.0 },
  },
  notes: { type: String },
  components: [{ type: String }],
  baseAcademicYear: {
    type: String,
    required: true,
    default: DEFAULT_BASE_ACADEMIC_YEAR,
  },
});

export const Course = model('Course', CourseSchema);
