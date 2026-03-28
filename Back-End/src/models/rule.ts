import { Schema } from 'mongoose';

export const RuleSchema = new Schema(
  {
    type: { type: String, required: true },
    level: { type: String, enum: ['warning', 'info'], default: 'warning' },
    message: { type: String, default: '' },
    params: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false },
);