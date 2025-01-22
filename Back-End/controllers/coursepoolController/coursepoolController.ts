import Database         from '@controllers/DBController/DBController'
import DB_OPS           from '@Util/DB_Ops'
import CoursePoolTypes  from '@controllers/coursepoolController/coursepool_types'
import { randomUUID }   from 'crypto'

const log = console.log;

async function createCoursePool(pool_name: string): Promise<DB_OPS> {

  const dbConn = await Database.getConnection();

  if( dbConn ) {
    let record: CoursePoolTypes.CoursePoolItem =
    {
      id : randomUUID(),
      name: pool_name
    };

    try {

      const result = await dbConn.request()
      .input('id'   , Database.msSQL.VarChar, record.id)
      .input('name' , Database.msSQL.VarChar, record.name)
      .query('INSERT INTO CoursePool ( id, name )\
              OUTPUT INSERTED.id\
              VALUES                 (@id, @name)');

      if ( undefined === result.recordset ) {
        log("Error inserting coursepool record: " + result.recordset);
        return DB_OPS.MOSTLY_OK;
      }
      else {
        return DB_OPS.SUCCESS;
      }

    } 
    catch ( error ) {
      log("Error in coursepool creation\n", error);
    }

  }

  return DB_OPS.FAILURE;
}

async function getAllCoursePools():
Promise<{course_pools: CoursePoolTypes.CoursePoolItem[]} | undefined> {
  const dbConn = await Database.getConnection();

  if( dbConn ) {
    try {
      const result = await dbConn.request()
      .query('SELECT * FROM CoursePool');

      return {
        course_pools: result.recordset
      };
    } 
    catch (error) {
      log("Error fetching all course pools\n", error);
    }
  }

  return undefined;
}

async function getCoursePool(pool_id: string):
Promise<CoursePoolTypes.CoursePoolItem | undefined> {
  const dbConn = await Database.getConnection();

  if( dbConn ) {
    try {
      const result = await dbConn.request()
      .input('id', Database.msSQL.VarChar, pool_id)
      .query('SELECT * FROM CoursePool\
              WHERE id = @id');

      return result.recordset[0];
    } 
    catch (error) {
      log("Error fetching course pool by ID\n", error);
    }
  }

  return undefined;
}

async function updateCoursePool(update_info: CoursePoolTypes.CoursePoolItem):
Promise<DB_OPS> {
  const dbConn = await Database.getConnection();

  if( dbConn ) {
    const { id, name } = update_info; 

    try {
      const result = await dbConn.request()
      .input('id'   , Database.msSQL.VarChar, id)
      .input('name' , Database.msSQL.VarChar, name)
      .query('UPDATE CoursePool  \
              SET   name = @name \
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
      log('Error in updating course pool item\n', error);
    }
  }

  return DB_OPS.FAILURE;
}

const coursepoolController = {
  createCoursePool,
  getAllCoursePools,
  getCoursePool,
  updateCoursePool
};

export default coursepoolController;