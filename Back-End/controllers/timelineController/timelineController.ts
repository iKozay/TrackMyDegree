import Database       from '@controllers/DBController/DBController'
import TimelineTypes  from '@controllers/timelineController/timeline_types'
import DB_OPS         from '@Util/DB_Ops';
import { randomUUID } from 'crypto'

const log = console.log;


async function saveTimeline(userTimeline: { user_id: string, name: string, items: { timeline_id: string, semesterName: string, coursecode: string[] }[] }[]): 
Promise<DB_OPS> {


  const dbConn            = await Database.getConnection();
  let   successfulInserts = 0;

  if( dbConn ) {            
    for (const timeline of userTimeline){
      const { user_id, name, items } = timeline;
      const timeline_id = randomUUID();
      const result_timeline = await dbConn.request()
        .input("id", Database.msSQL.VarChar, timeline_id)
        .input("user_id", Database.msSQL.VarChar, user_id)
        .input("name", Database.msSQL.VarChar, name)
        .query(
          `INSERT INTO Timeline (id, user_id, name)
          OUTPUT INSERTED.id
           VALUES (@id, @user_id, @name)`
        );

      if (!result_timeline.recordset || result_timeline.recordset.length === 0) {
        continue;     // Skip if timeline creation failed
      }

      for (const item of items) {
        const [season, yearStr] = item.semesterName.split(" ");                   // Extract season & year
        const year = parseInt(yearStr, 10);
  
        if (!season || isNaN(year)) {
          log(`Invalid season_year format: ${item.semesterName}`);
          continue;
        }

        const timeline_item_id = randomUUID()

        const result_item = await dbConn.request()
        .input("id", Database.msSQL.VarChar, timeline_item_id)
        .input("timeline_id", Database.msSQL.VarChar, timeline_id)
        .input("season", Database.msSQL.VarChar, season) // Extract season
        .input("year", Database.msSQL.Int, year) // Extract year
        .query(
          `INSERT INTO TimelineItems (id, timeline_id, season, year)
            OUTPUT INSERTED.id
           VALUES (@id, @timeline_id, @season, @year)`
        );


        if ( !result_item.recordset || result_item.recordset.length === 0 ) {
          log("Error updating timeline item record ", result_item.recordset);
        }
  

        for (const coursecode of item.coursecode) {
          try {
            if (!coursecode) {
              console.error("Skipping empty course entry.");
              continue;
            }
            await dbConn.request()
            .input("timeline_item_id", Database.msSQL.VarChar, timeline_item_id)
            .input("coursecode", Database.msSQL.VarChar, coursecode)
            .query(`
              INSERT INTO TimelineItemXCourses (timeline_item_id, coursecode)
              VALUES (@timeline_item_id, @coursecode)
            `);
          successfulInserts++;
          }
          catch ( error ){
            log("Error in Timeline update\n", error);
          }
        }
      }
    }                                                   //Check if DB connection instance is undefined

      return successfulInserts > 0 ? DB_OPS.SUCCESS : DB_OPS.FAILURE;                                                                 
  }

  return DB_OPS.FAILURE;
}

async function getAllTimelines(user_id: string): 
Promise<TimelineTypes.UserTimeline[] | undefined> {

  const dbConn = await Database.getConnection();

  if( dbConn ) {
    try {

      const timeline_result = await dbConn.request()
      .input('user_id', Database.msSQL.VarChar, user_id)
      .query('SELECT id, user_id, name FROM Timeline \
              WHERE user_id = @user_id');

      const timelines = timeline_result.recordset;

    if (!timelines.length) {
      return []; // No timelines found, return an empty array
    }

      const timeline_ids = timelines.map(t => `'${t.id}'`).join(",");  
      const timeline_item_result = await dbConn.request()
          .input('timeline_id', Database.msSQL.VarChar, timeline_ids)
          .query(`SELECT id, timeline_id, season, year FROM TimelineItems \
                  WHERE timeline_id IN (${timeline_ids})`);

      const timeline_items = timeline_item_result.recordset;

      const timeline_item_ids = timeline_items.map(t => `'${t.id}'`).join(",");  
      const timeline_item_course_result = await dbConn.request()
          .input('timeline_item_id', Database.msSQL.VarChar, timeline_item_ids)
          .query(`SELECT timeline_item_id, coursecode FROM TimelineItemXCourses \
                  WHERE timeline_item_id IN (${timeline_item_ids})`);

      const timeline_items_courses = timeline_item_course_result.recordset;

      const timeline_map: Record<string, any> = {};

      for (const timeline of timelines) {
        timeline_map[timeline.id] = {
          id: timeline.id,
          user_id: timeline.user_id,
          name: timeline.name,
          items: [] // Initialize empty items array
        };
      }

      // Initialize timeline items
      const timeline_item_map: Record<string, TimelineTypes.TimelineItem> = {};

      for (const item of timeline_items) {
        const timeline_item: TimelineTypes.TimelineItem = {
          id: item.id,
          timeline_id: item.timeline_id,
          season: item.season,
          year: item.year,
          coursecode: [] // Will be populated with courses
        };
  
        timeline_map[item.timeline_id].items.push(timeline_item);
        timeline_item_map[item.id] = timeline_item;
  
      }

      for (const course of timeline_items_courses) {
        if (timeline_item_map[course.timeline_item_id]) {
          timeline_item_map[course.timeline_item_id].coursecode.push(course.coursecode);
        }
        console.log(course)
      }
      return Object.values(timeline_map); 

    } catch ( error ) {
      log("Error fetching all user timelines\n", error);
    }
  }

  return undefined;
}

async function removeUserTimeline(timeline_id: string): 
Promise<DB_OPS> {

  const dbConn = await Database.getConnection();

  if( dbConn ) {
    try {

      const result = await dbConn.request()
          .input('id', Database.msSQL.VarChar, timeline_id)
          .query('DELETE FROM Timeline\
                  OUTPUT DELETED.id\
                  WHERE id = @id');

      if( (result.recordset.length > 0) && 
          (result.recordset[0].id === timeline_id) ) {
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
  saveTimeline,
  getAllTimelines,
  removeUserTimeline
};

export default timelineController;