import { Schema, model } from 'mongoose';

const DeficiencySchema = new Schema({
  coursepool: { type: String, required: true },
  creditsRequired: { type: Number, required: true }
});

const UserSchema = new Schema({
  _id: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullname: { type: String, required: true },
  degree: { type: String, ref: 'Degree' },
  type: { type: String, enum: ['student', 'advisor', 'admin'], required: true },
  otp: { type: String, default: null },
  otpExpire: { type: Date, default: null },
  deficiencies: [DeficiencySchema],
  exemptions: [{ type: String, ref: 'Course' }]
});

export const User = model('User', UserSchema);