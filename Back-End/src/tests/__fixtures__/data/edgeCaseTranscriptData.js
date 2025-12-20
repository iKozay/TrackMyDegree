module.exports = {
  programMissingDetails: {
    status: 'Active in Program',
    startDate: 'Fall 2020',
    degreeType: '',
    major: '',
    admitTerm: '',
    note: '',
  },

  courseWithOther: {
    courseCode: 'ENGR 101',
    grade: 'B+',
    credits: 3,
    other: 'WKRT',
  },

  minimalFieldsCourse: {
    courseCode: 'PHYS 101',
    grade: 'C',
    credits: 1,
  },

  zeroGradeCourse: {
    courseCode: 'MATH 101',
    grade: '0.00',
    other: 'WKRT',
    credits: 3,
  },

  passCourse: {
    courseCode: 'PHYS 101',
    grade: 'PASS',
  },

  exCourse: {
    courseCode: 'ENGR 101',
    grade: 'EX',
  },

  rptCourse: {
    courseCode: 'HIST 101',
    grade: 'B+',
    credits: 3,
    other: 'RPT',
  },

  malformedGrades: [
    { courseCode: 'COMP 101', grade: '' },
    { courseCode: 'MATH 201', grade: 'XYZ' },
    { courseCode: 'PHYS 101', grade: 'A*#' },
    { courseCode: 'CHEM 101', grade: '99.99' },
    { courseCode: 'BIOL 101', grade: 'NULL' },
  ],
};
