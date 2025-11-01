import Database from '@controllers/DBController/DBController';
import { v4 as uuidv4 } from 'uuid';
import TimelineTypes from './timeline_types';

export default class TimelineRepository {
  // Utility to start a transaction
  static async startTransaction() {
    const dbConn = await Database.getConnection();
    if (!dbConn) throw new Error('Failed to establish database connection.');
    const transaction = dbConn.transaction();
    await transaction.begin();
    return transaction;
  }

  // Find timeline by user_id + name
  static async findTimelineByUserAndName(
    transaction: any,
    user_id: string,
    name: string,
  ) {
    return transaction
      .request()
      .input('user_id', Database.msSQL.VarChar, user_id)
      .input('name', Database.msSQL.VarChar, name)
      .query(
        `SELECT id FROM Timeline WHERE user_id = @user_id AND name = @name`,
      );
  }

  // Upsert timeline metadata
  static async upsertTimeline(
    transaction: any,
    timeline: TimelineTypes.Timeline,
  ): Promise<string> {
    const { user_id, name, degree_id, isExtendedCredit } = timeline;
    const lastModified = new Date();
    const existing = await this.findTimelineByUserAndName(
      transaction,
      user_id,
      name,
    );

    if (existing.recordset.length > 0) {
      const timelineId = existing.recordset[0].id;
      await transaction
        .request()
        .input('timelineId', Database.msSQL.VarChar, timelineId)
        .input('lastModified', Database.msSQL.DateTime, lastModified)
        .input('degree_id', Database.msSQL.VarChar, degree_id)
        .input('isExtendedCredit', Database.msSQL.Bit, isExtendedCredit)
        .query(
          `UPDATE Timeline 
           SET last_modified = @lastModified, degree_id = @degree_id, isExtendedCredit = @isExtendedCredit
           WHERE id = @timelineId`,
        );
      return timelineId;
    } else {
      const timelineId = uuidv4();
      await transaction
        .request()
        .input('id', Database.msSQL.VarChar, timelineId)
        .input('user_id', Database.msSQL.VarChar, user_id)
        .input('degree_id', Database.msSQL.VarChar, degree_id)
        .input('name', Database.msSQL.VarChar, name)
        .input('lastModified', Database.msSQL.DateTime, lastModified)
        .input('isExtendedCredit', Database.msSQL.Bit, isExtendedCredit)
        .query(
          `INSERT INTO Timeline (id, user_id, degree_id, name, last_modified, isExtendedCredit)
           VALUES (@id, @user_id, @degree_id, @name, @lastModified, @isExtendedCredit)`,
        );
      return timelineId;
    }
  }

  // Delete timeline items and their courses
  static async deleteTimelineItems(transaction: any, timelineId: string) {
    const itemsResult = await transaction
      .request()
      .input('timelineId', Database.msSQL.VarChar, timelineId)
      .query(`SELECT id FROM TimelineItems WHERE timeline_id = @timelineId`);

    const timelineItemIds = itemsResult.recordset.map((i: any) => i.id);
    if (timelineItemIds.length === 0) return;

    // Delete linked courses
    await transaction
      .request()
      .query(
        `DELETE FROM TimelineItemXCourses WHERE timeline_item_id IN (${timelineItemIds
          .map((id: string) => `'${id}'`)
          .join(',')})`,
      );

    // Delete items
    await transaction
      .request()
      .input('timelineId', Database.msSQL.VarChar, timelineId)
      .query(`DELETE FROM TimelineItems WHERE timeline_id = @timelineId`);
  }

  // Insert a single timeline item + its courses
  static async insertTimelineItem(
    transaction: any,
    timelineId: string,
    item: TimelineTypes.TimelineItem,
  ) {
    const timelineItemId = uuidv4();
    await transaction
      .request()
      .input('id', Database.msSQL.VarChar, timelineItemId)
      .input('timelineId', Database.msSQL.VarChar, timelineId)
      .input('season', Database.msSQL.VarChar, item.season)
      .input('year', Database.msSQL.Int, item.year)
      .query(
        `INSERT INTO TimelineItems (id, timeline_id, season, year) VALUES (@id, @timelineId, @season, @year)`,
      );

    const uniqueCourses = Array.from(new Set(item.courses));
    for (const courseCode of uniqueCourses) {
      await transaction
        .request()
        .input('timelineItemId', Database.msSQL.VarChar, timelineItemId)
        .input('courseCode', Database.msSQL.VarChar, courseCode)
        .query(
          `INSERT INTO TimelineItemXCourses (timeline_item_id, coursecode) VALUES (@timelineItemId, @courseCode)`,
        );
    }
  }

  // Batch insert timeline items
  static async insertTimelineItems(
    transaction: any,
    timelineId: string,
    items: TimelineTypes.TimelineItem[],
  ) {
    for (const item of items) {
      await this.insertTimelineItem(transaction, timelineId, item);
    }
  }

  // Fetch all timelines for a user, including items and courses
  static async getTimelinesByUser(
    transaction: any,
    user_id: string,
  ): Promise<TimelineTypes.Timeline[]> {
    const result = await transaction
      .request()
      .input('user_id', Database.msSQL.VarChar, user_id).query(`
        SELECT t.id, t.user_id, t.degree_id, t.name, t.last_modified, t.isExtendedCredit,
               ti.id AS itemId, ti.season, ti.year, tic.coursecode
        FROM Timeline t
        LEFT JOIN TimelineItems ti ON t.id = ti.timeline_id
        LEFT JOIN TimelineItemXCourses tic ON ti.id = tic.timeline_item_id
        WHERE t.user_id = @user_id
        ORDER BY ti.year, ti.season
      `);

    const timelinesMap: { [id: string]: TimelineTypes.Timeline } = {};
    for (const row of result.recordset) {
      if (!timelinesMap[row.id]) {
        timelinesMap[row.id] = {
          id: row.id,
          user_id: row.user_id,
          degree_id: row.degree_id,
          name: row.name,
          last_modified: row.last_modified,
          isExtendedCredit: row.isExtendedCredit,
          items: [],
        };
      }
      if (row.itemId) {
        let item = timelinesMap[row.id].items.find((i) => i.id === row.itemId);
        if (!item) {
          item = {
            id: row.itemId,
            season: row.season,
            year: row.year,
            courses: [],
          };
          timelinesMap[row.id].items.push(item);
        }
        if (row.coursecode) {
          item.courses.push(row.coursecode);
        }
      }
    }

    return Object.values(timelinesMap);
  }

  // Delete a timeline
  static async deleteTimeline(transaction: any, timelineId: string) {
    const result = await transaction
      .request()
      .input('id', Database.msSQL.VarChar, timelineId)
      .query(`DELETE FROM Timeline OUTPUT DELETED.id WHERE id = @id`);
    return result.rowsAffected[0];
  }
}
