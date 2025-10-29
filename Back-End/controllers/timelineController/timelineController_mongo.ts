import mongoose, { Schema, Document, Model } from 'mongoose';
import * as Sentry from '@sentry/node';
import TimelineTypes from '../timelineController/timeline_types';

const log = console.log;

// ----------------------
// MongoDB Schema
// ----------------------
interface ITimelineItem extends Document {
  season: 'fall' | 'winter' | 'summer1' | 'summer2' | 'fall/winter' | 'summer';
  year: number;
  courses: string[];
}

interface ITimeline extends Document {
  user_id: string;
  name: string;
  degree_id: string;
  items: ITimelineItem[];
  isExtendedCredit: boolean;
  last_modified?: Date;
}

const TimelineItemSchema = new Schema<ITimelineItem>({
  season: { type: String, required: true },
  year: { type: Number, required: true },
  courses: { type: [String], required: true },
});

const TimelineSchema = new Schema<ITimeline>(
  {
    user_id: { type: String, required: true },
    name: { type: String, required: true },
    degree_id: { type: String, required: true },
    items: { type: [TimelineItemSchema], default: [] },
    isExtendedCredit: { type: Boolean, required: true },
    last_modified: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const TimelineModel: Model<ITimeline> =
  mongoose.models.Timeline ||
  mongoose.model<ITimeline>('Timeline', TimelineSchema);

// ----------------------
// Controller Functions
// ----------------------

/**
 * Save or update a timeline (upsert)
 */
export async function saveTimeline(
  timeline: TimelineTypes.Timeline,
): Promise<TimelineTypes.Timeline> {
  try {
    const { user_id, name, degree_id, items, isExtendedCredit } = timeline;

    if (!user_id || !name || !degree_id) {
      throw new Error('User ID, timeline name, and degree ID are required');
    }

    const updatedTimeline = await TimelineModel.findOneAndUpdate(
      { user_id, name, degree_id },
      {
        user_id,
        name,
        degree_id,
        items,
        isExtendedCredit,
        last_modified: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
    return {
      id: updatedTimeline._id.toString(), // NOSONAR - must convert ObjectId to string
      user_id: updatedTimeline.user_id,
      name: updatedTimeline.name,
      degree_id: updatedTimeline.degree_id,
      items: updatedTimeline.items.map((item: ITimelineItem) => ({
        id: item._id?.toString(),
        season: item.season,
        year: item.year,
        courses: item.courses,
      })),
      isExtendedCredit: updatedTimeline.isExtendedCredit,
      last_modified: updatedTimeline.last_modified,
    };
  } catch (error) {
    Sentry.captureException(error);
    log('Error saving timeline (Mongo):', error);
    throw error;
  }
}

/**
 * Fetch all timelines for a given user
 */
export async function getTimelinesByUser(
  user_id: string,
): Promise<TimelineTypes.Timeline[]> {
  try {
    const timelines = await TimelineModel.find({ user_id }).lean();

    return timelines.map((t) => ({
      id: t._id.toString(), // NOSONAR - must convert ObjectId to string
      user_id: t.user_id,
      name: t.name,
      degree_id: t.degree_id,
      items: t.items.map((item: ITimelineItem) => ({
        id: item._id?.toString(),
        season: item.season,
        year: item.year,
        courses: item.courses,
      })),
      isExtendedCredit: t.isExtendedCredit,
      last_modified: t.last_modified,
    }));
  } catch (error) {
    Sentry.captureException(error);
    log('Error fetching timelines (Mongo):', error);
    throw error;
  }
}

/**
 * Remove a timeline by ID
 */
export async function removeUserTimeline(
  timeline_id: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const result = await TimelineModel.findByIdAndDelete(timeline_id);

    if (!result) {
      return { success: false, message: `Timeline ${timeline_id} not found` };
    }

    return {
      success: true,
      message: `Timeline ${timeline_id} deleted successfully`,
    };
  } catch (error) {
    Sentry.captureException(error);
    log('Error deleting timeline (Mongo):', error);
    return {
      success: false,
      message: 'Error occurred while deleting timeline.',
    };
  }
}

export default { saveTimeline, getTimelinesByUser, removeUserTimeline };
