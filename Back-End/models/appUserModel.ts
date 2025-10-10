import { model, Schema, Document } from 'mongoose';

// A minimal schema just for existence checks
const AppUserSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  // ... other user fields would go here
});

export default model('AppUser', AppUserSchema);