import TimelineTypes from '@controllers/timelineController/timeline_types';
import * as Sentry from '@sentry/node';
import TimelineRepository from './timelineRepository';
import { MongoClient, ObjectId } from 'mongodb';


const log = console.log;
let timelinesCollection: any;

async function initDb() {
  const client = new MongoClient('mongodb://localhost:27017'); // remplace par ton URI
  await client.connect();
  const db = client.db('yourDbName'); // remplace par le nom de ta DB
  timelinesCollection = db.collection('timelines');
}

initDb().catch(err => log('DB connection error', err));


/**
 * Save or update a timeline
 */
async function saveTimeline(timeline: TimelineTypes.Timeline): Promise<TimelineTypes.Timeline> {
  try {
    if (!timeline.user_id || !timeline.name || !timeline.degree_id) {
      throw new Error('User ID, timeline name, and degree ID are required');
    }

    const timelineId = timeline.id ? new ObjectId(timeline.id) : new ObjectId();

    await timelinesCollection.updateOne(
      { _id: timelineId },
      {
        $set: { ...timeline, last_modified: new Date() },
        $push: { items: { $each: timeline.items.map(item => ({ ...item, id: new ObjectId() })) } }
      },
      { upsert: true }
    );

    return { ...timeline, id: timelineId.toString(), last_modified: new Date() };
  } catch (error) {
    Sentry.captureException(error);
    log('Error saving timeline:', error);
    throw error;
  }
}


    // Upsert timeline metadata
    const timelineId = await TimelineRepository.upsertTimeline(transaction, timeline);

    // Remove old timeline items before reinserting
    await TimelineRepository.deleteTimelineItems(transaction, timelineId);

    // Insert new timeline items
    await TimelineRepository.insertTimelineItems(transaction, timelineId, items);

    await transaction.commit();

    return { ...timeline, id: timelineId, last_modified: new Date() };
  } catch (error) {
    await transaction.rollback();
    Sentry.captureException(error);
    log('Error saving timeline:', error);
    throw error;
  }
}

/**
 * Fetch all timelines for a user
 */
async function getTimelinesByUser(user_id: string): Promise<TimelineTypes.Timeline[]> {
  try {
    const timelines = await timelinesCollection.find({ user_id }).toArray();
    return timelines.map(t => ({ ...t, id: t._id.toString() }));
  } catch (error) {
    Sentry.captureException(error);
    log('Error fetching timelines for user:', error);
    throw error;
  }
}


/**
 * Remove a timeline by ID
 */
async function removeUserTimeline(timeline_id: string): Promise<{ success: boolean; message: string }> {
  const transaction = await TimelineRepository.startTransaction();

  try {
    const deletedCount = await TimelineRepository.deleteTimeline(transaction, timeline_id);
    await transaction.commit();

    return deletedCount > 0
      ? { success: true, message: `Timeline ${timeline_id} deleted successfully` }
      : { success: false, message: `Timeline ${timeline_id} not found` };
  } catch (error) {
    await transaction.rollback();
    Sentry.captureException(error);
    log('Error removing timeline:', error);
    return { success: false, message: 'Error occurred while deleting timeline.' };
  }
}

export default { saveTimeline, getTimelinesByUser, removeUserTimeline };