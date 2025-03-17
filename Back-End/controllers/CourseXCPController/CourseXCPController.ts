import Database         from '@controllers/DBController/DBController'
import CourseXCPTypes   from '@controllers/CourseXCPController/CourseXCP_types'
import DB_OPS           from '@Util/DB_Ops'
import { randomUUID }   from 'crypto'

const log = console.log;

async function createCourseXCP(new_record: CourseXCPTypes.CourseXCP): 
Promise <DB_OPS> {

  const dbConn = await Database.getConnection();

  if( dbConn ) {
    const { coursecode, coursepool_id, group_id } = new_record;
    const record_id = randomUUID();

    try {
      const result = await dbConn.request()
      .input('id'        , Database.msSQL.VarChar, record_id)
      .input('coursecode', Database.msSQL.VarChar, coursecode)
      .input('coursepool', Database.msSQL.VarChar, coursepool_id)
      .input('group_id'  , Database.msSQL.VarChar || '', group_id)
      .query('INSERT INTO CourseXCoursePool \
              ( id, coursecode, coursepool, group_id )\
              OUTPUT INSERTED.id\
              VALUES\
              (@id, @coursecode, @coursepool, @group_id)');

      
      if ( undefined === result.recordset ) {
        log("Error inserting courseXcoursepool record: " + result.recordset);
        return DB_OPS.MOSTLY_OK;
      }
      else {
        return DB_OPS.SUCCESS;
      }
    } 
    catch ( error ) {
      log("Error in courseXcoursepool creation\n", error);
    }

  }

  return DB_OPS.FAILURE;
}
/**
 * Retrieves all course codes for a given course pool ID.
 *
 * @param {string} coursepool_id - The ID of the course pool.
 * @returns {Promise<{ course_codes: string[] } | undefined>}
 */

async function getAllCourseXCP(coursepool_id: string): 
Promise<{course_codes: string[]} | undefined> {

  const dbConn = await Database.getConnection();

  if( dbConn ) {
    try {
      const result = await dbConn.request()
      .input('coursepool', Database.msSQL.VarChar, coursepool_id)
      .query('SELECT coursecode FROM CourseXCoursePool\
              WHERE coursepool = @coursepool');

      const codes = [];
      for(let i = 0; i < result.recordset.length; i++) {
        codes.push(result.recordset[i].coursecode)
      }

      return {
        course_codes: codes
      }
    } 
    catch ( error ) {
      log("Error fetching all course codes for given coursepool id\n", error);
    }
  }

  return undefined;
}
/**
 * Updates a CourseXCoursePool record.
 *
 * @param {CourseXCPTypes.CourseXCPItem} update_record - The updated record details.
 * @returns {Promise<DB_OPS>}
 */
async function updateCourseXCP(update_record: CourseXCPTypes.CourseXCPItem):
Promise<DB_OPS> {

  const dbConn = await Database.getConnection();

  if( dbConn ) {
    const { id, coursecode, coursepool_id, group_id } = update_record; 

    try {
      const result = await dbConn.request()
      .input('id'   , Database.msSQL.VarChar, id)
      .input('coursecode' , Database.msSQL.VarChar, coursecode)
      .input('coursepool' , Database.msSQL.VarChar, coursepool_id)
      .input('group_id'   , Database.msSQL.VarChar || '', group_id)
      .query('UPDATE CourseXCoursePool  \
              SET \
                coursecode = @coursecode \
                coursepool = @coursepool \
                group_id = @group_id \
              OUTPUT INSERTED.id \
              WHERE   id = @id');

      if( (result.recordset.length > 0) && 
          (id === result.recordset[0].id) ) {
        return DB_OPS.SUCCESS;
      }
      else {
        return DB_OPS.MOSTLY_OK;
      }

    } 
    catch (error) {
      log('Error in updating courseXcoursepool item\n', error);
    }
  }

  return DB_OPS.FAILURE
}
/**
 * Removes a CourseXCoursePool record.
 *
 * @param {CourseXCPTypes.CourseXCP} delete_record - The record details to delete.
 * @returns {Promise<DB_OPS>}
 */

async function removeDegreeXCP(delete_record: CourseXCPTypes.CourseXCP): 
Promise<DB_OPS> {
  const dbConn = await Database.getConnection();

  if( dbConn ) {
    const { coursecode, coursepool_id, group_id } = delete_record;

    try {
      const result = await dbConn.request()
          .input('coursecode' , Database.msSQL.VarChar, coursecode)
          .input('coursepool' , Database.msSQL.VarChar, coursepool_id)
          .input('group_id'   , Database.msSQL.VarChar || '', group_id)
          .query('DELETE FROM CourseXCoursePool\
                  OUTPUT DELETED.coursecode\
                  WHERE coursecode = @coursecode\
                  AND   coursepool = @coursepool\
                  AND   group_id = @group_id');

      if( (result.recordset.length > 0) && 
          (result.recordset[0].coursecode === coursecode) ) {
        return DB_OPS.SUCCESS;
      }
      else {
        return DB_OPS.MOSTLY_OK;
      }
    } 
    catch (error) {
      log('Error in deleting degreeXcoursepool item\n', error);
    }
  }

  return DB_OPS.FAILURE;
}

const CourseXCPController = {
  createCourseXCP,
  getAllCourseXCP,
  updateCourseXCP,
  removeDegreeXCP
};

export default CourseXCPController;