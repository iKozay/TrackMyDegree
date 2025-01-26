
declare namespace CourseXCPTypes {

  type CourseXCP = {
    coursecode    : string;
    coursepool_id : string;
  };

  type CourseXCPItem = CourseXCP & {
    id: string;
  };

}

export default CourseXCPTypes;