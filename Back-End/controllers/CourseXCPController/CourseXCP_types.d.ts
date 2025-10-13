
declare namespace CourseXCPTypes {

  type CourseXCP = {
    coursecode    : string;
    coursepool_id : string;
    group_id      : string;
  };

  type CourseXCPItem = CourseXCP & {
    id: string;
  };

}

export default CourseXCPTypes;