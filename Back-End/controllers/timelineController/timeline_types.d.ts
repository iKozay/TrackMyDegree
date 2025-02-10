
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
    timeline_id : string;    // link to a specific timeline
    season      : Season;
    year        : number;
    coursecode  : string[];    
  };

  type UserTimeline = {
    id          : string;
    user_id     : string;
    name        : string;
    items       : TimelineItem[];
  };

  type TimelineInfo = {
    id          : string;
    course_item : TimelineItem;
    user_id     : string;
  };

  enum TimelineResponse {
    SUCCESS,
    MOSTLY_OK,
    FAILURE
  };
}

export default TimelineTypes;