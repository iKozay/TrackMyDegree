
declare namespace TimelineTypes {
  enum Season {
    FALL        = "Fall",
    WINTER      = "Winter",
    FALL_WINTER = "Fall/Winter",
    SUMMER      = "Summer",
    SUMMER_1    = "Summer_1",
    SUMMER_2    = "Summer_2",
  };

  type TimelineItem = {
    id          : string;
    season      : Season;
    year        : number;
    coursecode  : string;    
  };

  type TimelineInfo = {
    id          : string;
    course_item : TimelineItem;
    user_id     : string;
  };

  type UserTimeline = {
    user_id        : string;
    timeline_items : TimelineItem[];
  };

  enum TimelineResponse {
    SUCCESS,
    MOSTLY_OK,
    FAILURE
  };
}

export default TimelineTypes;