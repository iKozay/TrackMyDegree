const getAllMock =  [
  {
      code: "CS101",
      title: "Introduction to Computer Science",
      credits: 3,
      description: "An introductory course covering basic programming concepts.",
      requisites: [], // No prerequisites
  },
  {
      code: "CS201",
      title: "Data Structures and Algorithms",
      credits: 4,
      description: "A course on fundamental data structures and algorithms.",
      requisites: [
          { type: "prerequisite", courseCode: "CS101" }, // Requires CS101
      ],
  },
  {
      code: "MATH101",
      title: "Calculus I",
      credits: 4,
      description: "An introduction to differential and integral calculus.",
      requisites: [], // No prerequisites
  },
  {
      code: "PHYS101",
      title: "Physics I",
      credits: 4,
      description: "A foundational course in mechanics and thermodynamics.",
      requisites: [
          { type: "corequisite", courseCode: "MATH101" }, // Requires MATH101 as a corequisite
      ],
  },
  {
      code: "CS301",
      title: "Advanced Programming",
      credits: 3,
      description: "A course on advanced programming techniques and paradigms.",
      requisites: [
          { type: "prerequisite", courseCode: "CS201" }, // Requires CS201
          { type: "corequisite", courseCode: "MATH101" }, // Requires MATH101 as a corequisite
      ],
  },
];

const courseMock = {
  code: "CS101",
  title: "Introduction to Computer Science",
  credits: 3,
  description: "An introductory course covering basic programming concepts.",
  requisites: [], // No prerequisites
};

const courses_mocks = {
  getAllMock,
  courseMock
};

module.exports = courses_mocks;