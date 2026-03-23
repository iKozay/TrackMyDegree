const {
  processSemestersFromParsedData,
  generateSemestersFromPredefinedSequence,
  generateEmptySemesters
} = require('@services/timeline/semesterBuilder');

const { getCourseData } = require('@services/timeline/dataLoader');
const { getTermRanges } = require('@utils/misc');

jest.mock('@services/timeline/dataLoader');


describe('processSemestersFromParsedData', () => {

  const mockCourse = {
    _id: "COMP 202",
    name: "Foundations of Programming"
  };

  beforeEach(() => {
    jest.clearAllMocks();

  });

  test('returns empty array if parsedData has no semesters', async () => {

    const result = await processSemestersFromParsedData(
      {},
      { name: "Test Degree" },
      [],
      {},
      {}
    );

    expect(result).toEqual([]);
  });

  test('processes completed course', async () => {

    const parsedData = {
      semesters: [
        {
          term: "Fall 2023",
          courses: [{ code: "COMP202", grade: "A" }]
        }
      ]
    };

    const courseStatusMap = {};

    const result = await processSemestersFromParsedData(
      parsedData,
      { name: "Test Degree" },
      [{ name: "core", courses: ["COMP 202"] }],
      { "COMP 202": mockCourse },
      courseStatusMap
    );

    expect(result[0].courses[0].code).toBe("COMP 202");
    expect(courseStatusMap["COMP 202"].status).toBe("completed");
  });

  test('marks course as planned for future term', async () => {

    const parsedData = {
      semesters: [
        {
          term: "Fall 2099",
          courses: [{ code: "COMP202" }]
        }
      ]
    };

    const courseStatusMap = {};

    await processSemestersFromParsedData(
      parsedData,
      { name: "Test Degree" },
      [{ name: "core", courses: ["COMP202"] }],
      { "COMP 202": mockCourse },
      courseStatusMap
    );

    expect(courseStatusMap["COMP 202"].status).toBe("planned");
  });

  test('handles unused credits pool', async () => {

    const parsedData = {
      semesters: [
        {
          term: "Fall 2023",
          courses: [{ code: "HIST100", grade: "A" }]
        }
      ]
    };

    const courseStatusMap = {};

    const result = await processSemestersFromParsedData(
      parsedData,
      { name: "Test Degree" },
      [{ name: "unused credits", courses: ["HIST 100"] }],
      { "HIST 100": {
            _id: "HIST 100",
            name: "Foundations of Programming"
        } },
      courseStatusMap
    );

    expect(result[0].courses[0].message)
      .toBe("Course not part of degree requirements");
  });

});


describe('generateSemestersFromPredefinedSequence', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('generates academic semester', async () => {

    const sequence = [
      {
        type: "Academic",
        courses: ["COMP 202"]
      }
    ];

    const result = await generateSemestersFromPredefinedSequence(
      sequence,
      "Fall 2024",
      { COMP202: { _id: "COMP 202" } },
      {}
    );

    expect(result[0].courses[0].code).toBe("COMP 202");
  });

  test('generates coop term', async () => {

    const sequence = [
      {
        type: "Co-op",
        coopLabel: "Work Term 1"
      }
    ];

    const result = await generateSemestersFromPredefinedSequence(
      sequence,
      "Fall 2024",
      {},
      {}
    );

    expect(result[0].courses[0].message).toBe("Co-op Work Term");
  });

  test('fetches missing course from loader', async () => {

    getCourseData.mockResolvedValue({
      _id: "COMP 303"
    });

    const sequence = [
      {
        type: "Academic",
        courses: ["COMP 303"]
      }
    ];

    const courses = {};
    const statusMap = {};

    const result = await generateSemestersFromPredefinedSequence(
      sequence,
      "Fall 2024",
      courses,
      statusMap
    );

    expect(getCourseData).toHaveBeenCalledWith("COMP 303");
    expect(result[0].courses[0].code).toBe("COMP 303");
  });

});


describe('generateEmptySemesters', () => {

  test('generates terms between start and end', () => {

    const result = generateEmptySemesters("Fall 2023", "Winter 2024");

    expect(result).toEqual([
      { term: "FALL 2023", courses: [] },
      { term: "WINTER 2024", courses: [] }
    ]);

  });

});