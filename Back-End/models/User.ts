import { Schema, model } from 'mongoose';

const DeficiencySchema = new Schema({
  coursepool: { type: String, required: true },
  creditsRequired: { type: Number, required: true },
});

const UserSchema = new Schema({
  // _id is automatically created by MongoDB
  email: { type: String, required: true, unique: true },
  password: { type: String, default: null },
  fullname: { type: String, default: null },
  degree: { type: String, ref: 'Degree', default: null },
  type: { type: String, enum: ['student', 'advisor', 'admin'], default: 'student' },
  otp: { type: String, default: null },
  otpExpire: { type: Date, default: null },
  deficiencies: [DeficiencySchema],
  exemptions: [{ type: String, ref: 'Course' }],
});

export const User = model('User', UserSchema);
