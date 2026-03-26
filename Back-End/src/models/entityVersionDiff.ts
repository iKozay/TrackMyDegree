import { Schema, model } from 'mongoose';

const EntityVersionDiffSchema = new Schema(
  {
    _id: { type: String, required: true },
    entityType: {
      type: String,
      required: true,
      enum: ['Degree', 'CoursePool', 'Course'],
    },
    entityId: { type: String, required: true },
    academicYear: { type: String, required: true },
    academicYearStart: { type: Number, required: true },
    patch: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

EntityVersionDiffSchema.index(
  { entityType: 1, entityId: 1, academicYear: 1 },
  { unique: true },
);
EntityVersionDiffSchema.index({
  entityType: 1,
  entityId: 1,
  academicYearStart: 1,
});

export const EntityVersionDiff = model(
  'EntityVersionDiff',
  EntityVersionDiffSchema,
);
