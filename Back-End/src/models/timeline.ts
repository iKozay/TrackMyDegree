import { Schema, model } from 'mongoose';

const SemesterSchema = new Schema({
  term: { type: String, required: true },
  courses: [
    {
      code:{type:String, required:true},
      message:{type:String}
    }
  ],

},{_id:false});

const CourseStatusSchema = new Schema(
  {
    status: {
      type: String,
      enum: ['completed', 'incomplete', 'planned', 'inprogress', 'exempted'],
      required: true,
    },
    semester: { type: String, default: null },
  },
  { _id: false }
);

const TimelineSchema = new Schema({
  // _id is automatically created by MongoDB
  userId: { type: String, ref: 'User', required: true },
  degreeId: { type: String, ref: 'Degree', required:true },
  name: { type: String, required: true },
  isExtendedCredit: { type: Boolean, default: false },
  isCoop:{ type: Boolean, default: false },
  semesters: {type:[SemesterSchema], default:[]},
  courseStatusMap: { //key:course code (string)
    type: Map,
    of: CourseStatusSchema,
    default: () => new Map(),
  },
  exemptions: {type: [String], default:[]},
  deficiencies: {type: [String], default:[]},
},
{timestamps:true}
);

/* INDEXES */
TimelineSchema.index({ userId: 1, updatedAt: -1 });

export const Timeline = model('Timeline', TimelineSchema);
