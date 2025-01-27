import computerScienceGroup from "./soen_courses/computer_science_group.json";
import soenElectives from "./soen_courses/soen_electives.json";
import soenCore from './soen_courses/soen_core.json';
import engineeringNaturalScience from './soen_courses/engineering_natural_science_group.json';
import engineeringCore from './engineering_core.json';
import humanities from './general_education_electives/humanities.json';
import otherStudies from './general_education_electives/other_complementary_studies.json';
import socialSciences from './general_education_electives/social_sciences.json';


const genEdElec = [
  {title: 'Humanities', courseList: humanities},
  {title: 'Social Sciences', courseList: socialSciences},
  {title: 'Other Complementary Studies', courseList: otherStudies},
];
const soenCourses = [
  {title: 'Engineering Core', credits: 30.5, courseList: engineeringCore, subcourseTitle: 'General Education Electives', subcourseCredits: 3, subcourses: genEdElec},
  {title: 'Software Engineering Core', credits: 47.5, courseList: soenCore},
  {title: 'Computer Science Group', credits: 23, courseList: computerScienceGroup},
  {title: 'Engineering and Natural Science Group', credits: 3, courseList: engineeringNaturalScience},
  {title: 'Software Engineering Electives', credits: 16, courseList: soenElectives, elective: true},
];

export default soenCourses;