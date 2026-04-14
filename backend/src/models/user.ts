import { Schema, model } from 'mongoose';
const UserSchema = new Schema({
  // _id is automatically created by MongoDB
  email: { type: String, required: true, unique: true },
  password: { type: String, default: null },
  fullname: { type: String, required: true },
  type: { type: String, enum: ['student', 'advisor', 'admin'], required: true },
});

export const User = model('User', UserSchema);
