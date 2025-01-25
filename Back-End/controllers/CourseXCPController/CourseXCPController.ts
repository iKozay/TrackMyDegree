import Database         from '@controllers/DBController/DBController'
import CourseXCPTypes   from '@controllers/CourseXCPController/CourseXCP_types'
import DB_OPS           from '@Util/DB_Ops'
import { randomUUID }   from 'crypto'

const log = console.log;

async function createCourseXCP(new_record: CourseXCPTypes.CourseXCP): 
Promise <DB_OPS> {

  const dbConn = await Database.getConnection();

  if( dbConn ) {
    const { coursecode, coursepool_id } = new_record;
    const record_id = randomUUID();

    try {
      const result = await dbConn.request()
      .input('id'        , Database.msSQL.VarChar, record_id)
      .input('coursecode', Database.msSQL.VarChar, coursecode)
      .input('coursepool', Database.msSQL.VarChar, coursepool_id)
      .query('INSERT INTO CourseXCoursePool \
              ( id, coursecode, coursepool )\
              OUTPUT INSERTED.id\
              VALUES\
              (@id, @coursecode, @coursepool)');

      
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

async function updateCourseXCP(update_record: CourseXCPTypes.CourseXCPItem):
Promise<DB_OPS> {

  const dbConn = await Database.getConnection();

  if( dbConn ) {
    const { id, coursecode, coursepool_id } = update_record; 

    try {
      const result = await dbConn.request()
      .input('id'   , Database.msSQL.VarChar, id)
      .input('coursecode' , Database.msSQL.VarChar, coursecode)
      .input('coursepool' , Database.msSQL.VarChar, coursepool_id)
      .query('UPDATE CourseXCoursePool  \
              SET \
                coursecode = @coursecode \
                coursepool = @coursepool \
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

async function removeDegreeXCP(delete_record: CourseXCPTypes.CourseXCP): 
Promise<DB_OPS> {
  const dbConn = await Database.getConnection();

  if( dbConn ) {
    const { coursecode, coursepool_id } = delete_record;

    try {
      const result = await dbConn.request()
          .input('coursecode' , Database.msSQL.VarChar, coursecode)
          .input('coursepool' , Database.msSQL.VarChar, coursepool_id)
          .query('DELETE FROM CourseXCoursePool\
                  OUTPUT DELETED.coursecode\
                  WHERE coursecode = @coursecode\
                  AND   coursepool = @coursepool');

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