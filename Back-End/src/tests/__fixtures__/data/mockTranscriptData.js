module.exports = {
  studentInfo: {
    studentName: 'John Doe Student',
    city: 'Montreal',
    province: 'QC',
  },
  terms: [
    {
      term: 'Fall',
      year: '2020',
      courseCount: 3,
      termGPA: 3.67,
      courses: [
        { courseCode: 'COMP 248', grade: 'A-', credits: 3.0 }, // NOSONAR - we want to keep the zero fraction for testing
        { courseCode: 'ENGR 201', grade: 'B+', credits: 2.0 }, // NOSONAR - we want to keep the zero fraction for testing
        { courseCode: 'MATH 205', grade: 'A', credits: 3.0 }, // NOSONAR - we want to keep the zero fraction for testing
      ],
    },
    {
      term: 'Winter',
      year: '2021',
      courseCount: 3,
      termGPA: 3.56,
      courses: [
        { courseCode: 'COMP 249', grade: 'A', credits: 3.75 },
        { courseCode: 'ENGR 202', grade: 'B', credits: 3.0 }, // NOSONAR - we want to keep the zero fraction for testing
        { courseCode: 'MATH 206', grade: 'A-', credits: 3.0 }, // NOSONAR - we want to keep the zero fraction for testing
      ],
    },
    {
      term: 'Summer',
      year: '2021',
      courseCount: 2,
      termGPA: 3.67,
      courses: [
        { courseCode: 'COMP 352', grade: 'A+', credits: 3.75 },
        { courseCode: 'ELEC 273', grade: 'B+', credits: 3.75 },
      ],
    },
  ],
  transferCredits: [
    { courseCode: 'MATH 101', grade: 'EX' },
    { courseCode: 'PHYS 101', grade: 'PASS' },
  ],
  additionalInfo: {
    overallGPA: 3.75,
    minCreditsRequired: 120.0, // NOSONAR - we want to keep the zero fraction for testing
    programCreditsEarned: 90.5,
  },
};
