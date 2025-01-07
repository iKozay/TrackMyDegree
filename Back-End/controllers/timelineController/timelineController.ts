import Database       from '@controllers/DBController/DBController'
import TimelineTypes  from '@controllers/timelineController/timeline_types'
import { randomUUID } from 'crypto'

const log = console.log;


async function createTimeline(userTimeline: TimelineTypes.UserTimeline){
  const dbConn = await Database.getConnection();
  let records: TimelineTypes.TimelineInfo[] = [];

  userTimeline.timeline_items.forEach((item, index) => {
    records.push(
      {
        id          : randomUUID(),
        course_item : item,
        user_id     : userTimeline.user_id
      }
    );


  })
}


const timelineController = {
  createTimeline
};

export default timelineController;