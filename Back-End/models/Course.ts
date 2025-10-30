import { Schema, model } from 'mongoose';

const CourseSchema = new Schema({
  _id: { type: String }, // course code ex: 'SOEN490'
  title: { type: String, required: true },
  credits: { type: Number, required: true },
  description: { type: String },
  offeredIn: [{ type: String }], // e.g., ['fall', 'winter']
  corequisites: [{ type: String, ref: 'Course' }], // references to Course _id
  prerequisites: [{ type: String, ref: 'Course' }], // references to Course _id
});

export const Course = model('Course', CourseSchema);
