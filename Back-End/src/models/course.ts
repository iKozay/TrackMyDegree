import { Schema, model } from 'mongoose';
import { RuleSchema } from './rule';

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
});

export const Course = model('Course', CourseSchema);
