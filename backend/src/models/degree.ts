import { Schema, model } from 'mongoose';

const DEFAULT_BASE_ACADEMIC_YEAR = '2025-2026';

const DegreeSchema = new Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true, unique: true },
  degreeType: {
      type: String,
      enum: ['Standalone', 'ECP', 'Co-op', 'Other'],
      required: true,
      default: 'Other',
    },
  totalCredits: { type: Number, required: true },
  coursePools: [{ type: String, ref: 'CoursePool' }],
  ecpDegreeId: { type: String },
  baseAcademicYear: {
    type: String,
    required: true,
    default: DEFAULT_BASE_ACADEMIC_YEAR,
  },
});

export const Degree = model('Degree', DegreeSchema);
