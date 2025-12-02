import { Schema, model } from 'mongoose';

const CoursePoolSchema = new Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  creditsRequired: { type: Number, required: true },
  courses: [{ type: String, ref: 'Course' }],
});

export const CoursePool = model('CoursePool', CoursePoolSchema);
