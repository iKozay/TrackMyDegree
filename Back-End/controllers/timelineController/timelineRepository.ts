import Database from '@controllers/DBController/DBController';
import { v4 as uuidv4 } from 'uuid';
import TimelineTypes from './timeline_types';

export default class TimelineRepository {
  static async findTimelineByUserAndName(transaction: any, user_id: string, name: string) {
    return transaction
      .request()
      .input('user_id', Database.msSQL.VarChar, user_id)
      .input('name', Database.msSQL.VarChar, name)
      .query(`SELECT id FROM Timeline WHERE user_id = @user_id AND name = @name`);
  }

  static async insertTimeline(transaction: any, timeline: TimelineTypes.Timeline, timelineId: string) {
    return transaction
      .request()
      .input('id', Database.msSQL.VarChar, timelineId)
      .input('user_id', Database.msSQL.VarChar, timeline.user_id)
      .input('degree_id', Database.msSQL.VarChar, timeline.degree_id)
      .input('name', Database.msSQL.VarChar, timeline.name)
      .input('lastModified', Database.msSQL.DateTime, new Date())
      .input('isExtendedCredit', Database.msSQL.Bit, timeline.isExtendedCredit)
      .query(`INSERT INTO Timeline (id, user_id, degree_id, name, last_modified, isExtendedCredit)
              VALUES (@id, @user_id, @degree_id, @name, @lastModified, @isExtendedCredit)`);
  }

  static async deleteTimelineItems(transaction: any, timelineId: string) {
    const itemsResult = await transaction
      .request()
      .input('timelineId', Database.msSQL.VarChar, timelineId)
      .query(`SELECT id FROM TimelineItems WHERE timeline_id = @timelineId`);

    const timelineItemIds = itemsResult.recordset.map((i: any) => i.id);
    if (timelineItemIds.length === 0) return;

    await transaction.request().query(
      `DELETE FROM TimelineItemXCourses WHERE timeline_item_id IN (${timelineItemIds.map((id: string) => `'${id}'`).join(',')})`,
    );
    await transaction
      .request()
      .input('timelineId', Database.msSQL.VarChar, timelineId)
      .query(`DELETE FROM TimelineItems WHERE timeline_id = @timelineId`);
  }

  static async insertTimelineItem(transaction: any, timelineId: string, item: TimelineTypes.TimelineItem) {
    const timelineItemId = uuidv4();
    await transaction
      .request()
      .input('id', Database.msSQL.VarChar, timelineItemId)
      .input('timelineId', Database.msSQL.VarChar, timelineId)
      .input('season', Database.msSQL.VarChar, item.season)
      .input('year', Database.msSQL.Int, item.year)
      .query(`INSERT INTO TimelineItems (id, timeline_id, season, year)
              VALUES (@id, @timelineId, @season, @year)`);

    const uniqueCourses = Array.from(new Set(item.courses));
    for (const courseCode of uniqueCourses) {
      await transaction
        .request()
        .input('timelineItemId', Database.msSQL.VarChar, timelineItemId)
        .input('courseCode', Database.msSQL.VarChar, courseCode)
        .query(`INSERT INTO TimelineItemXCourses (timeline_item_id, coursecode)
                VALUES (@timelineItemId, @courseCode)`);
    }
  }

  static async deleteTimeline(transaction: any, timelineId: string) {
    return transaction
      .request()
      .input('id', Database.msSQL.VarChar, timelineId)
      .query(`DELETE FROM Timeline OUTPUT DELETED.id WHERE id = @id`);
  }
}
