import Database       from '@controllers/DBController/DBController'
import TimelineTypes  from '@controllers/timelineController/timeline_types'
import DB_OPS         from '@Util/DB_Ops';
import { randomUUID } from 'crypto'

const log = console.log;


async function createTimeline(userTimeline: TimelineTypes.UserTimeline): 
Promise<DB_OPS> {

  let record;                                                                  //TimelineTypes.TimelineInfo;
  
  const dbConn            = await Database.getConnection();
  let   successfulInserts = 0;

  if( dbConn ) {                                                               //Check if DB connection instance is undefined
    const { timeline_items } = userTimeline;

    for(let i = 0; i < timeline_items.length; i++) {
      record =                                                                 //Store timeline record information 
      {
        id          : randomUUID(),
        course_item : timeline_items[i],
        user_id     : userTimeline.user_id
      };
  
      try {
        const courseItem = record.course_item;
        const result     = await dbConn.request()
        .input('id'        , Database.msSQL.VarChar, record.id)
        .input('season'    , Database.msSQL.VarChar, courseItem.season)
        .input('year'      , Database.msSQL.Int    , courseItem.year)
        .input('coursecode', Database.msSQL.VarChar, courseItem.coursecode)
        .input('user_id'   , Database.msSQL.VarChar, record.user_id)
        .query('INSERT INTO Timeline ( id,  season,  year,  coursecode,  user_id)\
                OUTPUT INSERTED.id\
                VALUES               (@id, @season, @year, @coursecode, @user_id)');

        if ( undefined === result.recordset ) {
          log("Error inserting timeline record ", result.recordset);
        }
        else {
          successfulInserts++;
        }
      }
      catch ( error ){
        log("Error in Timeline creation\n", error);
      }
    }

    if( successfulInserts === userTimeline.timeline_items.length ) {           //Check if all records were successfully
      return DB_OPS.SUCCESS;                                                   //inserted in DB
    }
    else {                                                                     //Otherwise, specify that some were successful
      return DB_OPS.MOSTLY_OK;                                                 //and others not
    }                                                                          
  }

  return DB_OPS.FAILURE;
}

async function getAllTimelines(user_id: string): 
Promise<TimelineTypes.UserTimeline | undefined> {

  const dbConn = await Database.getConnection();

  if( dbConn ) {
    try {
      const result = await dbConn.request()
          .input('user_id', Database.msSQL.VarChar, user_id)
          .query('SELECT id, season, year, coursecode FROM Timeline \
                  WHERE user_id = @user_id');

      const timeline_courses = result.recordset;

      return {
        user_id       : user_id,
        timeline_items: timeline_courses
      }

    } catch ( error ) {
      log("Error fetching all user timelines\n", error);
    }
  }

  return undefined;
}

async function saveTimeline(userTimeline: { user_id: string, timeline_items: { semesterName: string, coursecode: string[] }[] }): 
Promise<DB_OPS> {

  
  const dbConn            = await Database.getConnection();
  let   successfulInserts = 0;

  if( dbConn ) {                                                               //Check if DB connection instance is undefined
    const { timeline_items, user_id } = userTimeline;

    for (const item of timeline_items) {
      const [season, yearStr] = item.semesterName.split(" ");                   // Extract season & year
      const year = parseInt(yearStr, 10);

      if (!season || isNaN(year)) {
        log(`Invalid season_year format: ${item.semesterName}`);
        continue;
      }


      for (const course of item.coursecode) {
        try {
          const result = await dbConn.request()
            .input('id'        , Database.msSQL.VarChar, randomUUID())
            .input('season'    , Database.msSQL.VarChar, season)
            .input('year'      , Database.msSQL.Int    , year)
            .input('coursecode', Database.msSQL.VarChar, course)
            .input('user_id'   , Database.msSQL.VarChar, user_id)
            .query(`
              UPDATE Timeline 
              SET season = @season, 
                  year = @year, 
                  coursecode = @coursecode, 
                  id = @id
              WHERE user_id = @user_id
            `);

          if ( undefined === result.recordset ) {
            log("Error updating timeline record ", result.recordset);
          }
          else {
            successfulInserts++;
          }
        }
        catch ( error ){
          log("Error in Timeline update\n", error);
        }
      }
    }

    if( successfulInserts === userTimeline.timeline_items.length ) {           //Check if all records were successfully
      return DB_OPS.SUCCESS;                                                   //inserted in DB
    }
    else {                                                                     //Otherwise, specify that some were successful
      return DB_OPS.MOSTLY_OK;                                                 //and others not
    }                                                                          
  }

  return DB_OPS.FAILURE;
}

async function removeTimelineItem(timeline_item_id: string): 
Promise<DB_OPS> {

  const dbConn = await Database.getConnection();

  if( dbConn ) {
    try {
      const result = await dbConn.request()
          .input('id', Database.msSQL.VarChar, timeline_item_id)
          .query('DELETE FROM Timeline\
                  OUTPUT DELETED.id\
                  WHERE id = @id');

      if( (result.recordset.length > 0) && 
          (result.recordset[0].id === timeline_item_id) ) {
        return DB_OPS.SUCCESS;
      }
      else {
        return DB_OPS.MOSTLY_OK;
      }

    } catch ( error ) {
      log('Error removing timeline item\n', error);
    }
  }

  return DB_OPS.FAILURE;
}


const timelineController = {
  createTimeline,
  getAllTimelines,
  saveTimeline,
  removeTimelineItem
};

export default timelineController;