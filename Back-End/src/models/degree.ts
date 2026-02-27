import { Schema, model } from 'mongoose';

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
});

export const Degree = model('Degree', DegreeSchema);
