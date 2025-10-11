/**
 * Purpose:
 *  - Small helper/controller module that talks to the CourseXCoursePool (long for XCP part) table.
 *    Provides functions to create, read, update and delete the mapping between
 *    courses and course pools.
 *
 * Notes:
 *  - Functions return a DB_OPS enum indicating high-level outcome
 *  - Errors are logged with console.log and sent to Sentry for monitoring.
 *  - They separated types for inputs which are declared in CourseXCP_types.d.ts.
 */

import Database from '@controllers/DBController/DBController';
import CourseXCPTypes from '@controllers/CourseXCPController/CourseXCP_types';
import DB_OPS from '@Util/DB_Ops';
import { randomUUID } from 'crypto';
import * as Sentry from '@sentry/node';

const log = console.log;

/**
 * Insert a new cours in CoursePool record.
 * - Expects: CourseXCPTypes.CourseXCP { coursecode, coursepool_id, group_id }
 * - Reults in inserting a row in CourseXCoursePool.
 * - Returns: DB_OPS.SUCCESS / DB_OPS.MOSTLY_OK / DB_OPS.FAILURE
 */
async function createCourseXCP(
  new_record: CourseXCPTypes.CourseXCP,
): Promise<DB_OPS> {
  const dbConn = await Database.getConnection();

  if (dbConn) {
    const { coursecode, coursepool_id, group_id } = new_record;
    const record_id = randomUUID();

    try {
      const result = await dbConn
        .request()
        .input('id', Database.msSQL.VarChar, record_id)
        .input('coursecode', Database.msSQL.VarChar, coursecode)
        .input('coursepool', Database.msSQL.VarChar, coursepool_id)
        // The `|| ''` here doesnt really change the type and is confusing — it ends up using the DB type
        .input('group_id', Database.msSQL.VarChar || '', group_id)
        .query(
          'INSERT INTO CourseXCoursePool \
              ( id, coursecode, coursepool, group_id )\
              OUTPUT INSERTED.id\
              VALUES\
              (@id, @coursecode, @coursepool, @group_id)',
        );

      if (undefined === result.recordset) {
        // INSERT ran but didnt return the inserted id for some reason
        log('Error inserting courseXcoursepool record: ' + result.recordset);
        Sentry.captureMessage(
          'Error inserting courseXcoursepool record: ' + result.recordset,
        );
        return DB_OPS.MOSTLY_OK;
      } else {
        return DB_OPS.SUCCESS;
      }
    } catch (error) {
      Sentry.captureException(error);
      log('Error in courseXcoursepool creation\n', error);
    }
  }

  return DB_OPS.FAILURE;
}

/**
 * Fetch all course codes for a given course pool id
 * - Input: coursepool_id (string)
 * - Output: { course_codes: string[] } on success, or undefined on error
 */
async function getAllCourseXCP(
  coursepool_id: string,
): Promise<{ course_codes: string[] } | undefined> {
  const dbConn = await Database.getConnection();

  if (dbConn) {
    try {
      const result = await dbConn
        .request()
        .input('coursepool', Database.msSQL.VarChar, coursepool_id)
        .query(
          'SELECT coursecode FROM CourseXCoursePool\
              WHERE coursepool = @coursepool',
        );

      // this essentially builds a simple array of codes from the returned rows
      const codes = [];
      for (let i = 0; i < result.recordset.length; i++) {
        codes.push(result.recordset[i].coursecode);
      }

      return {
        course_codes: codes,
      };
    } catch (error) {
      Sentry.captureException(error);
      log('Error fetching all course codes for given coursepool id\n', error);
    }
  }

  return undefined;
}

/**
 * Update existing CourseXCoursePool row.
 * - Expects: CourseXCPTypes.CourseXCPItem { id, coursecode, coursepool_id, group_id }
 * - Results in updating row in DB
 * - Returns: DB_OPS.SUCCESS / DB_OPS.MOSTLY_OK / DB_OPS.FAILURE
 *
 * SET clause in the SQL should have commas between assignments but
 *       As written now, SQL lines seems like they lack commas and might cause  syntax error
 */
async function updateCourseXCP(
  update_record: CourseXCPTypes.CourseXCPItem,
): Promise<DB_OPS> {
  const dbConn = await Database.getConnection();

  if (dbConn) {
    const { id, coursecode, coursepool_id, group_id } = update_record;

    try {
      const result = await dbConn
        .request()
        .input('id', Database.msSQL.VarChar, id)
        .input('coursecode', Database.msSQL.VarChar, coursecode)
        .input('coursepool', Database.msSQL.VarChar, coursepool_id)
        .input('group_id', Database.msSQL.VarChar || '', group_id)
        .query(
          'UPDATE CourseXCoursePool  \
              SET \
                coursecode = @coursecode \
                coursepool = @coursepool \
                group_id = @group_id \
              OUTPUT INSERTED.id \
              WHERE   id = @id',
        );

      if (result.recordset.length > 0 && id === result.recordset[0].id) {
        return DB_OPS.SUCCESS;
      } else {
        return DB_OPS.MOSTLY_OK;
      }
    } catch (error) {
      Sentry.captureException(error);
      log('Error in updating courseXcoursepool item\n', error);
    }
  }

  return DB_OPS.FAILURE;
}

/**
 * Delete a CourseXCoursePool mapping
 *
 * - Expects: CourseXCPTypes.CourseXCP { coursecode, coursepool_id, group_id }
 * - Results in deletng row(s) in the DB and retrns deleted.coursecode via OUTPUT.
 * - Returns: DB_OPS enum signaling result
 */
async function removeDegreeXCP( // should be removeCourseXCP?? seems confusing
  delete_record: CourseXCPTypes.CourseXCP,
): Promise<DB_OPS> {
  const dbConn = await Database.getConnection();

  if (dbConn) {
    const { coursecode, coursepool_id, group_id } = delete_record;

    try {
      const result = await dbConn
        .request()
        .input('coursecode', Database.msSQL.VarChar, coursecode)
        .input('coursepool', Database.msSQL.VarChar, coursepool_id)
        .input('group_id', Database.msSQL.VarChar || '', group_id)
        .query(
          'DELETE FROM CourseXCoursePool\
                  OUTPUT DELETED.coursecode\
                  WHERE coursecode = @coursecode\
                  AND   coursepool = @coursepool\
                  AND   group_id = @group_id',
        );

      if (
        result.recordset.length > 0 &&
        result.recordset[0].coursecode === coursecode
      ) {
        return DB_OPS.SUCCESS;
      } else {
        return DB_OPS.MOSTLY_OK;
      }
    } catch (error) {
      Sentry.captureException(error);
      log('Error in deleting degreeXcoursepool item\n', error);
    }
  }

  return DB_OPS.FAILURE;
}

// Exported controller API
const CourseXCPController = {
  createCourseXCP,
  getAllCourseXCP,
  updateCourseXCP,
  removeDegreeXCP,
};

export default CourseXCPController;
