import Database         from '@controllers/DBController/DBController'
import DegreeXCPTypes   from '@controllers/DegreeXCPController/DegreeXCP_types'
import CoursePoolTypes  from '@controllers/coursepoolController/coursepool_types'
import DB_OPS           from '@Util/DB_Ops'
import { randomUUID }   from 'crypto'

const log = console.log;
/**
 * Creates a new DegreeXCoursePool record in the database.
 * 
 * @param {DegreeXCPTypes.NewDegreeXCP} new_record - The new degreeXcoursepool record to be created.
 * @returns {Promise<DB_OPS>} - The result of the operation (SUCCESS, MOSTLY_OK, or FAILURE).
 */
async function createDegreeXCP(new_record: DegreeXCPTypes.NewDegreeXCP): 
Promise<DB_OPS> {

  const dbConn = await Database.getConnection();

  if( dbConn ) {
    const { degree_id, coursepool_id, credits } = new_record;
    const record_id = randomUUID();

    try {
      const result = await dbConn.request()
      .input('id'             , Database.msSQL.VarChar, record_id)
      .input('degree'         , Database.msSQL.VarChar, degree_id)
      .input('coursepool'     , Database.msSQL.VarChar, coursepool_id)
      .input('creditsRequired', Database.msSQL.Int    , credits)
      .query('INSERT INTO DegreeXCoursePool \
              ( id, degree, coursepool, creditsRequired )\
              OUTPUT INSERTED.id\
              VALUES\
              (@id, @degree, @coursepool, @creditsRequired)');

      
      if ( undefined === result.recordset ) {
        log("Error inserting degreeXcoursepool record: " + result.recordset);
        return DB_OPS.MOSTLY_OK;
      }
      else {
        return DB_OPS.SUCCESS;
      }
    } 
    catch ( error ) {
      log("Error in degreeXcoursepool creation\n", error);
    }

  }

  return DB_OPS.FAILURE;
}
/**
 * Retrieves all course pools associated with a specific degree.
 * 
 * @param {string} degree_id - The ID of the degree.
 * @returns {Promise<{course_pools: CoursePoolTypes.CoursePoolItem[]} | undefined>} - A list of course pools associated with the degree, or undefined if an error occurs.
 */

async function getAllDegreeXCP(degree_id: string): 
Promise<{course_pools: CoursePoolTypes.CoursePoolItem[]} | undefined> {

  const dbConn = await Database.getConnection();

  if( dbConn ) {
    try {
      const result = await dbConn.request()
      .input('degree_id', Database.msSQL.VarChar, degree_id)
      .query('SELECT cp.id, cp.name\
              FROM CoursePool cp\
              JOIN DegreeXCoursePool dxcp ON cp.id = dxcp.coursepool\
              WHERE dxcp.degree = @degree_id');

      return {
        course_pools: result.recordset
      }
    } 
    catch ( error ) {
      log("Error fetching all course pools for given degree id\n", error);
    }
  }

  return undefined;
}
/**
 * Updates an existing DegreeXCoursePool record.
 * 
 * @param {DegreeXCPTypes.DegreeXCPItem} update_record - The degreeXcoursepool record with updated information.
 * @returns {Promise<DB_OPS>} - The result of the operation (SUCCESS, MOSTLY_OK, or FAILURE).
 */
async function updateDegreeXCP(update_record: DegreeXCPTypes.DegreeXCPItem):
Promise<DB_OPS> {

  const dbConn = await Database.getConnection();

  if( dbConn ) {
    const { id, degree_id, coursepool_id, credits } = update_record; 

    try {
      const result = await dbConn.request()
      .input('id'   , Database.msSQL.VarChar, id)
      .input('degree' , Database.msSQL.VarChar, degree_id)
      .input('coursepool' , Database.msSQL.VarChar, coursepool_id)
      .input('creditsRequired' , Database.msSQL.Int, credits)
      .query('UPDATE DegreeXCoursePool  \
              SET \
                degree          = @degree \
                coursepool      = @coursepool \
                creditsRequired = @creditsRequired \
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
      log('Error in updating degreeXcoursepool item\n', error);
    }
  }

  return DB_OPS.FAILURE
}
/**
 * Removes a DegreeXCoursePool record from the database.
 * 
 * @param {DegreeXCPTypes.DegreeXCP} delete_record - The degreeXcoursepool record to be deleted.
 * @returns {Promise<DB_OPS>} - The result of the operation (SUCCESS, MOSTLY_OK, or FAILURE).
 */

async function removeDegreeXCP(delete_record: DegreeXCPTypes.DegreeXCP): 
Promise<DB_OPS> {
  const dbConn = await Database.getConnection();

  if( dbConn ) {
    const { degree_id, coursepool_id } = delete_record;

    try {
      const result = await dbConn.request()
          .input('degree'     , Database.msSQL.VarChar, degree_id)
          .input('coursepool' , Database.msSQL.VarChar, coursepool_id)
          .query('DELETE FROM DegreeXCoursePool\
                  OUTPUT DELETED.degree\
                  WHERE degree     = @degree\
                  AND   coursepool = @coursepool');

      if( (result.recordset.length > 0) && 
          (result.recordset[0].degree === degree_id) ) {
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

const DegreeXCPController = {
  createDegreeXCP,
  getAllDegreeXCP,
  updateDegreeXCP,
  removeDegreeXCP
};

export default DegreeXCPController;