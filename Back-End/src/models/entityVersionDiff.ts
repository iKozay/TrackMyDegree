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
    patch: {
      set: { type: Schema.Types.Mixed, default: {} },
      unset: { type: [String], default: [] },
      addToSet: { type: Schema.Types.Mixed, default: {} },
      pull: { type: Schema.Types.Mixed, default: {} },
    },
  },
  { timestamps: true },
);

EntityVersionDiffSchema.index(
  { entityType: 1, entityId: 1, academicYear: 1 },
  { unique: true },
);

export const EntityVersionDiff = model(
  'EntityVersionDiff',
  EntityVersionDiffSchema,
);
