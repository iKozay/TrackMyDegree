import TimelineTypes from '@controllers/timelineController/timeline_types';
import * as Sentry from '@sentry/node';
import { MongoClient, ObjectId } from 'mongodb';

const log = console.log;
let timelinesCollection: any;

async function initDb() {
  const client = new MongoClient('mongodb://localhost:27017'); // ton URI
  await client.connect();
  const db = client.db('yourDbName'); // ton DB name
  timelinesCollection = db.collection('timelines');
}

initDb().catch(err => log('DB connection error', err));



/** Save or upsert a timeline with items */
async function saveTimeline(timeline: TimelineTypes.Timeline): Promise<TimelineTypes.Timeline> {
  try {
    if (!timeline.user_id || !timeline.name || !timeline.degree_id) {
      throw new Error('User ID, timeline name, and degree ID are required');
    }

    // timelineId existant ou nouveau
    const timelineId = timeline.id ? new ObjectId(timeline.id) : new ObjectId();

    // Gestion des items : assigner un id si inexistant
    const itemsWithIds = timeline.items.map(item => ({
      ...item,
      id: item.id ? new ObjectId(item.id) : new ObjectId()
    }));

    // Upsert de la timeline
    await timelinesCollection.updateOne(
      { _id: timelineId },
      {
        $set: {
          user_id: timeline.user_id,
          name: timeline.name,
          degree_id: timeline.degree_id,
          isExtendedCredit: timeline.isExtendedCredit,
          last_modified: new Date()
        },
        $setOnInsert: { created_at: new Date() },
        $addToSet: { items: { $each: itemsWithIds } } // ajoute seulement les items qui n'existent pas encore
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



/** Upsert ou update un item spécifique */
async function upsertTimelineItem(timeline_id: string, item: TimelineTypes.TimelineItem) {
  try {
    const itemId = item.id ? new ObjectId(item.id) : new ObjectId();
    await timelinesCollection.updateOne(
      { _id: new ObjectId(timeline_id), 'items.id': itemId },
      { $set: { 'items.$': { ...item, id: itemId } } }
    );

    // Si l'item n'existait pas, on l'ajoute
    await timelinesCollection.updateOne(
      { _id: new ObjectId(timeline_id), 'items.id': { $ne: itemId } },
      { $push: { items: { ...item, id: itemId } } }
    );

    return { ...item, id: itemId.toString() };
  } catch (error) {
    Sentry.captureException(error);
    log('Error upserting timeline item:', error);
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
  try {
    const result = await timelinesCollection.deleteOne({ _id: new ObjectId(timeline_id) });
    return result.deletedCount > 0
      ? { success: true, message: `Timeline ${timeline_id} deleted successfully` }
      : { success: false, message: `Timeline ${timeline_id} not found` };
  } catch (error) {
    Sentry.captureException(error);
    log('Error removing timeline:', error);
    return { success: false, message: 'Error occurred while deleting timeline.' };
  }
}

async function updateTimelineItem(timeline_id: string, item: TimelineTypes.TimelineItem) {
  try {
    await timelinesCollection.updateOne(
      { _id: new ObjectId(timeline_id), 'items.id': new ObjectId(item.id) },
      { $set: { 'items.$': item } }
    );
  } catch (error) {
    Sentry.captureException(error);
    log('Error updating timeline item:', error);
    throw error;
  }
}

async function deleteTimelineItem(timeline_id: string, item_id: string) {
  try {
    await timelinesCollection.updateOne(
      { _id: new ObjectId(timeline_id) },
      { $pull: { items: { id: new ObjectId(item_id) } } }
    );
  } catch (error) {
    Sentry.captureException(error);
    log('Error deleting timeline item:', error);
    throw error;
  }
}



export default { saveTimeline, getTimelinesByUser, removeUserTimeline, updateTimelineItem, deleteTimelineItem, upsertTimelineItem };