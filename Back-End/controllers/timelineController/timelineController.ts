import Database       from '@controllers/DBController/DBController'
import TimelineTypes  from '@controllers/timelineController/timeline_types'
import { randomUUID } from 'crypto'

const log = console.log;


async function createTimeline(userTimeline: TimelineTypes.UserTimeline){
  const dbConn = await Database.getConnection();
  let record: TimelineTypes.TimelineInfo;

  userTimeline.timeline_items.forEach((item, index) => {

  })
}