import { Schema, model } from 'mongoose';
import { RuleSchema } from './rule';

const CoursePoolSchema = new Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  creditsRequired: { type: Number, required: true },
  courses: [{ type: String, ref: 'Course' }],
  rules: { type: [RuleSchema], default: [] },
});

export const CoursePool = model('CoursePool', CoursePoolSchema);
