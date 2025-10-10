import { model, Schema, Document } from 'mongoose';
import DegreeTypes from '@controllers/degreeController/degree_types';

// Omit 'id' from DegreeTypes.Degree to avoid conflict with Document's 'id'
export interface IDegree extends Omit<DegreeTypes.Degree, 'id'>, Document {
  id: string; // Explicitly declare id as string
}

const DegreeSchema: Schema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true, // Corresponds to the primary key in SQL
  },
  name: {
    type: String,
    required: true,
    unique: true,
  },
  totalCredits: {
    type: Number,
    required: true,
  },
});

export default model<IDegree>('Degree', DegreeSchema);