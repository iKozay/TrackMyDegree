import { Schema, model } from 'mongoose';

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
  },
  notes: { type: String },
  components: [{ type: String }],
});

export const Course = model('Course', CourseSchema);
