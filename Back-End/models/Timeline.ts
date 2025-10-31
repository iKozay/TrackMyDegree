import { Schema, model } from 'mongoose';

const TimelineItemSchema = new Schema({
  // _id is automatically created by MongoDB
  season: {
    type: String,
    enum: [
      'fall',
      'winter',
      'summer1',
      'summer2',
      'fall/winter',
      'summer',
      'exempted',
      'deficiencies',
    ],
    required: true,
  },
  year: { type: Number, required: true },
  courses: [{ type: String, ref: 'Course' }], // references to Course _id
});

const TimelineSchema = new Schema({
  // _id is automatically created by MongoDB
  userId: { type: String, ref: 'User', required: true },
  degreeId: { type: String, ref: 'Degree' },
  name: { type: String, required: true },
  isExtendedCredit: { type: Boolean, default: false },
  last_modified: { type: Date, default: Date.now },
  items: [TimelineItemSchema],
});

export const Timeline = model('Timeline', TimelineSchema);
