import Database       from '@controllers/DBController/DBController'
import TimelineTypes  from '@controllers/timelineController/timeline_types'
import { randomUUID } from 'crypto'

const log = console.log;


async function createTimeline(userTimeline: TimelineTypes.UserTimeline): 
Promise<TimelineTypes.TimelineResponse> {

  let record   : TimelineTypes.TimelineInfo;
  let response : TimelineTypes.TimelineResponse;
  
  const dbConn          = await Database.getConnection();
  let successfulInserts = [];
  const RESPONSE        = TimelineTypes.TimelineResponse;

  if(undefined !== dbConn) {                                                   //Check if DB connection instance is undefined
    userTimeline.timeline_items.forEach(async (item, index) => {
      record =                                                                 //Store timeline record information 
      {
        id          : randomUUID(),
        course_item : item,
        user_id     : userTimeline.user_id
      };
  
      try {
        const courseItem = record.course_item;
        const result     = await dbConn.request()
        .input('id'        , Database.msSQL.VarChar, record.id)
        .input('season'    , Database.msSQL.VarChar, courseItem.season)
        .input('year'      , Database.msSQL.Int    , courseItem.year)
        .input('coursecode', Database.msSQL.VarChar, courseItem.course_code)
        .input('user_id'   , Database.msSQL.VarChar, record.user_id)
        .query('INSERT INTO Timeline ( id,  season,  year,  coursecode,  user_id)\
                OUTPUT INSERTED.id\
                VALUES               (@id, @season, @year, @coursecode, @user_id)');

        if ((undefined) === (result.recordset)) {
          log("Error inserting timeline record ", result.recordset);
        }
        else {
          successfulInserts.push(result.recordset[0]);
        }
      }
      catch (error){
        log("Error in Timeline creation\n", error);
      }
    });

    if( successfulInserts.length === userTimeline.timeline_items.length ) {    //Check if all records were successfully
      response = RESPONSE.SUCCESS;                                             //inserted in DB
    }
    else {                                                                     //Otherwise, specify that some were successful
      response = RESPONSE.MOSTLY_OK;                                           //and others not
    }                                                                          

    return response;
  }

  return RESPONSE.FAILURE;
}


const timelineController = {
  createTimeline
};

export default timelineController;