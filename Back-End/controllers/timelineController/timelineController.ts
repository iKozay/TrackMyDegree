import Database from '@controllers/DBController/DBController'; // Mocro : Database connection manager
import TimelineTypes from '@controllers/timelineController/timeline_types'; // Mocro : Type definitions for timeline and items
import { v4 as uuidv4 } from 'uuid';   // Mocro : Generates unique IDs
import * as Sentry from '@sentry/node'; // Mocro : Error monitoring and logging

const log = console.log;

// Mocro : saveTimeline → Creates or updates a timeline for a user
// Mocro : Expected input: Timeline object with user_id, name, degree_id, items, and optional isExtendedCredit
// Mocro : Current behavior:
//        1. Opens database connection and transaction
//        2. Checks if timeline already exists for the user + name
//        3. If exists:
//             - Delete existing timeline items and courses
//             - Update timeline metadata (last_modified, degree_id, isExtendedCredit)
//        4. If not exists:
//             - Insert new timeline with metadata
//        5. Insert all timeline items and their associated courses
//        6. Commit transaction
// Mocro : Error handling: Sentry logs the error, transaction is rolled back
// Mocro : Refactoring opportunities:
//        - Move database queries to a separate repository layer to reduce controller responsibilities
//        - Consider batch inserts for TimelineItemXCourses to reduce multiple queries per item
//        - Add input validation before starting transaction to fail fast
//        - Consider breaking this function into smaller private functions for clarity
/**
 * Saves a timeline. If a timeline for the same user_id and name already exists, it is updated (overwritten).
 * The timeline JSON is expected to include a list of timeline items (each with season, year, and courses).
 */
// async function saveTimeline(
//   timeline: TimelineTypes.Timeline
// ): Promise<TimelineTypes.Timeline | undefined> {
//   const dbConn = await Database.getConnection();
//   if (!dbConn) return undefined;

//   // Destructure degree_id along with user_id, name, and items
//   const { user_id, name, degree_id, items } = timeline;
//   if (!user_id || !name || !degree_id) {
//     throw new Error("User ID, timeline name, and degree ID are required");
//   }

//   try {
//     // Check if a timeline exists for the user with the given name
//     const existingTimelineResult = await dbConn
//       .request()
//       .input("user_id", Database.msSQL.VarChar, user_id)
//       .input("name", Database.msSQL.VarChar, name)
//       .query(`SELECT id FROM Timeline WHERE user_id = @user_id AND name = @name`);

//     let timelineId: string;
//     const lastModified = new Date(); // Current timestamp

//     if (existingTimelineResult.recordset.length > 0) {
//       // Timeline exists—use its id and update last_modified and degree_id.
//       timelineId = existingTimelineResult.recordset[0].id;

//       // Remove existing timeline items and associated courses
//       const itemsResult = await dbConn
//         .request()
//         .input("timelineId", Database.msSQL.VarChar, timelineId)
//         .query(`SELECT id FROM TimelineItems WHERE timeline_id = @timelineId`);

//       const timelineItemIds = itemsResult.recordset.map((item: any) => item.id);

//       if (timelineItemIds.length > 0) {
//         await dbConn.request().query(
//           `DELETE FROM TimelineItemXCourses WHERE timeline_item_id IN (${timelineItemIds
//             .map((id: string) => `'${id}'`)
//             .join(",")})`
//         );
//         await dbConn
//           .request()
//           .input("timelineId", Database.msSQL.VarChar, timelineId)
//           .query(`DELETE FROM TimelineItems WHERE timeline_id = @timelineId`);
//       }

//       // Update last_modified and degree_id
//       await dbConn
//         .request()
//         .input("timelineId", Database.msSQL.VarChar, timelineId)
//         .input("lastModified", Database.msSQL.DateTime, lastModified)
//         .input("degree_id", Database.msSQL.VarChar, degree_id)
//         .query(
//           `UPDATE Timeline
//            SET last_modified = @lastModified, degree_id = @degree_id
//            WHERE id = @timelineId`
//         );
//     } else {
//       // Insert new timeline with last_modified and degree_id
//       timelineId = uuidv4();
//       await dbConn
//         .request()
//         .input("id", Database.msSQL.VarChar, timelineId)
//         .input("user_id", Database.msSQL.VarChar, user_id)
//         .input("degree_id", Database.msSQL.VarChar, degree_id)
//         .input("name", Database.msSQL.VarChar, name)
//         .input("lastModified", Database.msSQL.DateTime, lastModified)
//         .query(
//           `INSERT INTO Timeline (id, user_id, degree_id, name, last_modified)
//            VALUES (@id, @user_id, @degree_id, @name, @lastModified)`
//         );
//     }

//     // Insert timeline items and their courses
//     for (const item of items) {
//       const timelineItemId = uuidv4();
//       await dbConn
//         .request()
//         .input("id", Database.msSQL.VarChar, timelineItemId)
//         .input("timelineId", Database.msSQL.VarChar, timelineId)
//         .input("season", Database.msSQL.VarChar, item.season)
//         .input("year", Database.msSQL.Int, item.year)
//         .query(
//           `INSERT INTO TimelineItems (id, timeline_id, season, year)
//            VALUES (@id, @timelineId, @season, @year)`
//         );

//       for (const courseCode of item.courses) {
//         await dbConn
//           .request()
//           .input("timelineItemId", Database.msSQL.VarChar, timelineItemId)
//           .input("courseCode", Database.msSQL.VarChar, courseCode)
//           .query(
//             `INSERT INTO TimelineItemXCourses (timeline_item_id, coursecode)
//              VALUES (@timelineItemId, @courseCode)`
//           );
//       }
//     }

//     return {
//       id: timelineId,
//       user_id,
//       degree_id, // Include degree_id in the returned timeline
//       name,
//       last_modified: lastModified,
//       items,
//     };
//   } catch (error) {
//     log("Error saving timeline\n", error);
//     throw error;
//   }
// }

// Yassine : This function is to long. It updates, delete, and creates!!
async function saveTimeline(
  timeline: TimelineTypes.Timeline,
): Promise<TimelineTypes.Timeline | undefined> {
  const dbConn = await Database.getConnection();
  if (!dbConn) return undefined;

  const transaction = await dbConn.transaction();
  await transaction.begin();

  try {
    const { user_id, name, degree_id, items, isExtendedCredit } = timeline;
    if (!user_id || !name || !degree_id) {
      throw new Error('User ID, timeline name, and degree ID are required');
    }

    let timelineId: string;
    const lastModified = new Date();

    // Mocro : Check if timeline exists
    const existingTimelineResult = await transaction
      .request()
      .input('user_id', Database.msSQL.VarChar, user_id)
      .input('name', Database.msSQL.VarChar, name)
      .query(`SELECT id FROM Timeline WHERE user_id = @user_id AND name = @name`);

    if (existingTimelineResult.recordset.length > 0) {
      timelineId = existingTimelineResult.recordset[0].id;

      // Mocro : Delete existing timeline items and associated courses
      const itemsResult = await transaction
        .request()
        .input('timelineId', Database.msSQL.VarChar, timelineId)
        .query(`SELECT id FROM TimelineItems WHERE timeline_id = @timelineId`);

      const timelineItemIds = itemsResult.recordset.map((item: any) => item.id);
      if (timelineItemIds.length > 0) {
        await transaction
          .request()
          .query(
            `DELETE FROM TimelineItemXCourses WHERE timeline_item_id IN (${timelineItemIds
              .map((id: string) => `'${id}'`)
              .join(',')})`,
          );
        await transaction
          .request()
          .input('timelineId', Database.msSQL.VarChar, timelineId)
          .query(`DELETE FROM TimelineItems WHERE timeline_id = @timelineId`);
      }

      // Mocro : Update timeline metadata
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
    } else {
      // Mocro : Insert new timeline
      timelineId = uuidv4();
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
    }

    // Mocro : Insert timeline items and courses
    for (const item of items) {
      const timelineItemId = uuidv4();
      await transaction
        .request()
        .input('id', Database.msSQL.VarChar, timelineItemId)
        .input('timelineId', Database.msSQL.VarChar, timelineId)
        .input('season', Database.msSQL.VarChar, item.season)
        .input('year', Database.msSQL.Int, item.year)
        .query(
          `INSERT INTO TimelineItems (id, timeline_id, season, year) 
           VALUES (@id, @timelineId, @season, @year)`,
        );

      // Mocro : Deduplicate courses to avoid duplicate key conflicts
      const uniqueCourses = Array.from(new Set(item.courses));
      for (const courseCode of uniqueCourses) {
        await transaction
          .request()
          .input('timelineItemId', Database.msSQL.VarChar, timelineItemId)
          .input('courseCode', Database.msSQL.VarChar, courseCode)
          .query(
            `INSERT INTO TimelineItemXCourses (timeline_item_id, coursecode) 
             VALUES (@timelineItemId, @courseCode)`,
          );
      }
    }

    await transaction.commit();

    return {
      id: timelineId,
      user_id,
      degree_id,
      name,
      last_modified: lastModified,
      items,
      isExtendedCredit,
    };
  } catch (error) {
    Sentry.captureException(error);
    await transaction.rollback();
    log('Error saving timeline\n', error);
    throw error;
  }
}

// Mocro : getTimelinesByUser → Fetches all timelines for a specific user
// Mocro : Current behavior:
//        - Retrieves timeline metadata and items with associated courses
//        - Returns an array of timelines
// Mocro : Refactoring opportunities:
//        - Move complex query logic to a repository layer
//        - Consider batch fetching timeline items to reduce multiple DB calls
//        - Could return paginated results if user has many timelines
async function getTimelinesByUser(
  user_id: string,
): Promise<TimelineTypes.Timeline[] | undefined> {
  const dbConn = await Database.getConnection();
  if (!dbConn) return undefined;

  try {
    const timelinesResult = await dbConn
      .request()
      .input('user_id', Database.msSQL.VarChar, user_id)
      .query(
        `SELECT id, user_id, degree_id, name, last_modified, isExtendedCredit FROM Timeline WHERE user_id = @user_id`,
      );

    const timelinesRecords = timelinesResult.recordset;
    if (timelinesRecords.length === 0) return [];
    // Yassine: We need to consider bulk insert!
    const timelines: TimelineTypes.Timeline[] = [];
    for (const tl of timelinesRecords) {
      const itemsResult = await dbConn
        .request()
        .input('timelineId', Database.msSQL.VarChar, tl.id).query(`
          SELECT ti.id AS itemId, ti.season, ti.year, tic.coursecode
          FROM TimelineItems ti
          LEFT JOIN TimelineItemXCourses tic ON ti.id = tic.timeline_item_id
          WHERE ti.timeline_id = @timelineId
          ORDER BY ti.year, ti.season
        `);

      const itemsMap: { [key: string]: TimelineTypes.TimelineItem } = {};
      itemsResult.recordset.forEach((row: any) => {
        if (!itemsMap[row.itemId]) {
          itemsMap[row.itemId] = {
            id: row.itemId,
            season: row.season,
            year: row.year,
            courses: [],
          };
        }
        if (row.coursecode) {
          itemsMap[row.itemId].courses.push(row.coursecode);
        }
      });

      const items = Object.values(itemsMap);
      timelines.push({
        id: tl.id,
        user_id: tl.user_id,
        degree_id: tl.degree_id,
        name: tl.name,
        last_modified: tl.last_modified,
        items,
        isExtendedCredit: tl.isExtendedCredit,
      });
    }
    return timelines;
  } catch (error) {
    Sentry.captureException(error);
    log('Error fetching timelines for user\n', error);
    throw error;
  }
}

// Mocro : removeUserTimeline → Deletes a timeline by id
// Mocro : Current behavior:
//        - Attempts to delete timeline
//        - Returns a string describing result
// Mocro : Refactoring opportunities:
//        - Return a standard object with success boolean and message instead of parsing strings
//        - Move DB logic to repository
async function removeUserTimeline(timeline_id: string): Promise<string> {
  const dbConn = await Database.getConnection();

  if (!dbConn) {
    Sentry.captureMessage('Database connection failed.');
    return 'Database connection failed.';
  }

  try {
    const result = await dbConn
      .request()
      .input('id', Database.msSQL.VarChar, timeline_id).query(`
        DELETE FROM Timeline
        OUTPUT DELETED.id
        WHERE id = @id
      `);

    if (result.recordset.length > 0) {
      return `Timeline with id: ${result.recordset[0].id} deleted successfully`;
    } else {
      return `No timeline found with id: ${timeline_id}`;
    }
  } catch (error) {
    Sentry.captureException(error);
    log('Error removing timeline item\n', error);
    return 'Error occurred while deleting timeline.';
  }
}




const timelineController = {
  saveTimeline,
  getTimelinesByUser,
  removeUserTimeline,
};

export default timelineController;
