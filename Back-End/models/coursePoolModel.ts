import { model, Schema, Document } from 'mongoose';

// A minimal schema just for existence checks
const CoursePoolSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  // ... other course pool fields would go here
});

export default model('CoursePool', CoursePoolSchema);