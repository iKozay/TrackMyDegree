import CourseTypes from "@controllers/courseController/course_types"

declare namespace TimelineTypes {
  export enum Season {
    FALL,
    WINTER,
    FALL_WINTER,
    SUMMER,
    SUMMER_1,
    SUMMER_2,
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
    user_id: string;
    timeline_items: TimelineItem[];
  }
}

export default TimelineTypes;