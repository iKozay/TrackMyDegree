import computerScienceGroup from '../course data/soen_courses/computer_science_group.json';
import soenElectives from '../course data/soen_courses/soen_electives.json';
import soenCore from '../course data/soen_courses/soen_core.json';
import engineeringNaturalScience from '../course data/soen_courses/engineering_natural_science_group.json';
import engineeringCore from '../course data/engineering_core.json';
import humanities from '../course data/general_education_electives/humanities.json';
import otherStudies from '../course data/general_education_electives/other_complementary_studies.json';
import socialSciences from '../course data/general_education_electives/social_sciences.json';

const genEdElec = [
  { title: 'Humanities', courseList: humanities },
  { title: 'Social Sciences', courseList: socialSciences },
  { title: 'Other Complementary Studies', courseList: otherStudies },
];
const soenCourses = [
  {
    title: 'Engineering Core',
    credits: 30.5,
    courseList: engineeringCore,
    subcourseTitle: 'General Education Electives',
    subcourseCredits: 3,
    subcourses: genEdElec,
  },
  { title: 'Software Engineering Core', credits: 47.5, courseList: soenCore },
  {
    title: 'Computer Science Group',
    credits: 23,
    courseList: computerScienceGroup,
  },
  {
    title: 'Engineering and Natural Science Group',
    credits: 3,
    courseList: engineeringNaturalScience,
  },
  {
    title: 'Software Engineering Electives',
    credits: 16,
    courseList: soenElectives,
    elective: true,
  },
];

export default soenCourses;
