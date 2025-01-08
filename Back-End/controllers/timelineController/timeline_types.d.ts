import CourseTypes from "@controllers/courseController/course_types"

declare namespace TimelineTypes {
  export enum Season {
    FALL        = "Fall",
    WINTER      = "Winter",
    FALL_WINTER = "Fall/Winter",
    SUMMER      = "Summer",
    SUMMER_1    = "Summer_1",
    SUMMER_2    = "Summer_2",
  };

  export type TimelineItem = {
    season      : Season;
    year        : number;
    course_code : string;    
  };

  export type TimelineInfo = {
    id          : string;
    course_item : TimelineItem;
    user_id     : string;
  };

  export type UserTimeline = {
    user_id        : string;
    timeline_items : TimelineItem[];
  };

  export enum TimelineResponse {
    SUCCESS,
    MOSTLY_OK,
    FAILURE
  };
}

export default TimelineTypes;