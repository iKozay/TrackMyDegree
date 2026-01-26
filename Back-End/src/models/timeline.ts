import { Schema, model, InferSchemaType } from 'mongoose';

/* --- schemas --- */
const SemesterSchema = new Schema(
  {
    term: { type: String, required: true },
    courses: [
      {
        code: { type: String, required: true },
        message: { type: String },
      },
    ],
  },
  { _id: false },
);

const CourseStatusSchema = new Schema(
  {
    status: {
      type: String,
      enum: ['completed', 'incomplete', 'planned', 'exempted'],
      required: true,
    },
    semester: { type: String, default: null },
  },
  { _id: false },
);

const TimelineSchema = new Schema(
  {
    userId: { type: String, ref: 'User', required: true },
    degreeId: { type: String, ref: 'Degree', required: true },
    name: { type: String, required: true },
    isExtendedCredit: { type: Boolean, default: false },
    isCoop: { type: Boolean, default: false },
    semesters: { type: [SemesterSchema], default: [] },
    courseStatusMap: {
      type: Map,
      of: CourseStatusSchema,
      default: () => new Map(),
    },
    exemptions: { type: [String], default: [] },
    deficiencies: { type: [String], default: [] },
  },
  { timestamps: true },
);

/* INDEXES */
TimelineSchema.index({ userId: 1, updatedAt: -1 });

/* --- TYPE pour le document Mongoose --- */
export type TimelineDocument = InferSchemaType<typeof TimelineSchema>;

/* --- MODEL --- */
export const Timeline = model<TimelineDocument>('Timeline', TimelineSchema);
