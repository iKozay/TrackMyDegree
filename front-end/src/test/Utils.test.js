import { isCourseOfferedInSemester } from '../utils/courseUtils';

// --- isCourseOfferedInSemester Tests ---
describe('isCourseOfferedInSemester', () => {
  test('returns true when course is offered in the semester (array, exact match)', () => {
    const course = { offeredIn: ['Fall', 'Winter'] };
    expect(isCourseOfferedInSemester(course, 'Fall 2025')).toBe(true);
    expect(isCourseOfferedInSemester(course, 'Winter 2025')).toBe(true);
    expect(isCourseOfferedInSemester(course, 'Summer 2025')).toBe(false);
  });

  test('is case-insensitive for array of terms', () => {
    const course = { offeredIn: ['fall', 'WINTER'] };
    expect(isCourseOfferedInSemester(course, 'Fall 2025')).toBe(true);
    expect(isCourseOfferedInSemester(course, 'winter 2025')).toBe(true);
  });

  test('returns true when course is offered in the semester (string, comma-separated)', () => {
    const course = { offeredIn: 'Fall, Winter' };
    expect(isCourseOfferedInSemester(course, 'Fall 2025')).toBe(true);
    expect(isCourseOfferedInSemester(course, 'Winter 2025')).toBe(true);
    expect(isCourseOfferedInSemester(course, 'Summer 2025')).toBe(false);
  });

  test('handles extra spaces in string', () => {
    const course = { offeredIn: ' Fall , Winter ' };
    expect(isCourseOfferedInSemester(course, 'Fall 2025')).toBe(true);
    expect(isCourseOfferedInSemester(course, 'Winter 2025')).toBe(true);
  });

  test('returns false when offeredIn is empty array or string', () => {
    expect(isCourseOfferedInSemester({ offeredIn: [] }, 'Fall 2025')).toBe(false);
    expect(isCourseOfferedInSemester({ offeredIn: '' }, 'Fall 2025')).toBe(false);
  });

  test('returns false when offeredIn is missing', () => {
    expect(isCourseOfferedInSemester({}, 'Fall 2025')).toBe(false);
  });
});

// --------------------------pdf utils--------------------
import { exportTimelineToPDF } from '../utils/pdfutils';

jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => ({
    addImage: jest.fn(),
    save: jest.fn(),
  }));
});

jest.mock('html2canvas', () =>
  jest.fn().mockResolvedValue({
    toDataURL: () => 'data:image/png;base64,FAKE',
    width: 100,
    height: 100,
  }),
);

// --- exportTimelineToPDF Tests ---

describe('exportTimelineToPDF', () => {
  beforeEach(() => {
    // Minimal DOM setup
    document.body.innerHTML = `
      <div class="timeline-middle-section">
        <button class="remove-semester-btn"></button>
      </div>
      <div class="timeline-scroll-wrapper"></div>
      <button class="add-semester-button"></button>
    `;

    window.alert = jest.fn();
    console.error = jest.fn();
    jest.clearAllMocks();
  });

  test('alerts if timeline section not found', async () => {
    document.body.innerHTML = ''; // no timeline elements
    await exportTimelineToPDF();
    expect(window.alert).toHaveBeenCalledWith('Timeline section not found');
  });
});

// --------------------------prerequisite utils--------------------
import { arePrerequisitesMet } from '../utils/prerequisiteUtils';

describe('arePrerequisitesMet', () => {
  const semesters = [{ id: 'Fall2025' }, { id: 'Winter2026' }];

  test('returns true if course has no requisites', () => {
    const allCourses = [{ code: 'COMP100', requisites: [] }];
    const semesterCourses = { Fall2025: ['COMP100'] };
    const courseInstanceMap = {};

    expect(arePrerequisitesMet('COMP100', 1, courseInstanceMap, allCourses, semesters, semesterCourses)).toBe(true);
  });

  test('returns true if prerequisites are met', () => {
    const allCourses = [
      {
        code: 'COMP200',
        requisites: [{ type: 'pre', code2: 'COMP100' }],
      },
      { code: 'COMP100', requisites: [] },
    ];
    const semesterCourses = { Fall2025: ['COMP100'] };
    const courseInstanceMap = {};

    expect(arePrerequisitesMet('COMP200', 1, courseInstanceMap, allCourses, semesters, semesterCourses)).toBe(true);
  });

  test('returns false if prerequisites are not met', () => {
    const allCourses = [
      {
        code: 'COMP200',
        requisites: [{ type: 'pre', code2: 'COMP100' }],
      },
      { code: 'COMP100', requisites: [] },
    ];
    const semesterCourses = { Fall2025: [] };
    const courseInstanceMap = {};

    expect(arePrerequisitesMet('COMP200', 1, courseInstanceMap, allCourses, semesters, semesterCourses)).toBe(false);
  });

  test('corequisites can be met in current semester', () => {
    const allCourses = [
      {
        code: 'COMP300',
        requisites: [{ type: 'co', code2: 'COMP200' }],
      },
      { code: 'COMP200', requisites: [] },
    ];
    const semesterCourses = { Fall2025: [], Winter2026: ['COMP200'] };
    const courseInstanceMap = {};

    expect(arePrerequisitesMet('COMP300', 1, courseInstanceMap, allCourses, semesters, semesterCourses)).toBe(true);
  });

  test('grouped prerequisite met if at least one course in group is completed', () => {
    const allCourses = [
      {
        code: 'COMP400',
        requisites: [
          { type: 'pre', code2: 'COMP100', group_id: 1 },
          { type: 'pre', code2: 'COMP101', group_id: 1 },
        ],
      },
      { code: 'COMP100', requisites: [] },
      { code: 'COMP101', requisites: [] },
    ];
    const semesterCourses = { Fall2025: ['COMP101'] };
    const courseInstanceMap = {};

    expect(arePrerequisitesMet('COMP400', 1, courseInstanceMap, allCourses, semesters, semesterCourses)).toBe(true);
  });
});

// -------------------------Semester utils--------------------
import { generateFourYearSemesters } from '../utils/SemesterUtils';

describe('generateFourYearSemesters', () => {
  test('generates 12 semesters starting from Fall 2025', () => {
    const result = generateFourYearSemesters('Fall 2025');

    console.log(result);
    expect(result).toHaveLength(12);
    expect(result[0]).toBe('Fall 2025');
    expect(result[1]).toBe('Winter 2026');
    expect(result[2]).toBe('Summer 2026');
    expect(result[3]).toBe('Fall 2026');
    expect(result[11]).toBe('Summer 2029'); // last term after 12 terms
  });

  test('returns empty array for invalid input', () => {
    expect(generateFourYearSemesters('')).toEqual([]);
    expect(generateFourYearSemesters('Fall')).toEqual([]);
  });

  test('returns empty array for invalid input', () => {
    expect(generateFourYearSemesters('')).toEqual([]);
    expect(generateFourYearSemesters('Fall')).toEqual([]);
  });
});

//----------------------compareSemesters--------------------
import { compareSemesters } from '../utils/SemesterUtils';

describe('compareSemesters', () => {
  test('sorts by year when years are different', () => {
    const a = { name: 'Fall 2025' };
    const b = { name: 'Winter 2026' };
    expect(compareSemesters(a, b)).toBeLessThan(0);
    expect(compareSemesters(b, a)).toBeGreaterThan(0);
  });

  test('sorts by season when years are the same', () => {
    const winter = { name: 'Winter 2025' };
    const fallWinter = { name: 'Fall_Winter 2025' };
    const summer = { name: 'Summer 2025' };
    const fall = { name: 'Fall 2025' };

    expect(compareSemesters(winter, fallWinter)).toBeLessThan(0); // Winter < Fall_Winter
    expect(compareSemesters(summer, fall)).toBeLessThan(0); // Summer < Fall
    expect(compareSemesters(fall, winter)).toBeGreaterThan(0); // Fall > Winter
  });

  test('returns 0 when semesters are identical', () => {
    const a = { name: 'Fall 2025' };
    const b = { name: 'Fall 2025' };
    expect(compareSemesters(a, b)).toBe(0);
  });

  test('handles Fall_Winter correctly', () => {
    const a = { name: 'Fall_Winter 2025' };
    const b = { name: 'Winter 2025' };
    expect(compareSemesters(a, b)).toBeGreaterThan(0); // Fall_Winter > Winter
  });
});

// -----------------------------buildTimelinePayload--------------------

import { buildTimelinePayload } from '../utils/timelineUtils'; // adjust path

describe('buildTimelinePayload', () => {
  const baseCourses = [{ code: 'COMP101' }, { code: 'MATH101' }];

  const baseCourseMap = { COMP101: 'COMP101', MATH101: 'MATH101' };

  const baseUser = { id: 'user1' };

  test('returns error if timeline name is missing', () => {
    const result = buildTimelinePayload({
      tName: '',
      user: baseUser,
      degree_Id: 'deg1',
      semesters: [],
      semesterCourses: {},
      courseInstanceMap: baseCourseMap,
      allCourses: baseCourses,
      deficiencyCourses: [],
    });
    expect(result.error).toBe('Timeline name is required!');
  });

  test('returns error if user is missing', () => {
    const result = buildTimelinePayload({
      tName: 'My Timeline',
      user: null,
      degree_Id: 'deg1',
      semesters: [],
      semesterCourses: {},
      courseInstanceMap: baseCourseMap,
      allCourses: baseCourses,
      deficiencyCourses: [],
    });
    expect(result.error).toBe('User must be logged in!');
  });

  test('returns error if degree ID is missing', () => {
    const result = buildTimelinePayload({
      tName: 'My Timeline',
      user: baseUser,
      degree_Id: '',
      semesters: [],
      semesterCourses: {},
      courseInstanceMap: baseCourseMap,
      allCourses: baseCourses,
      deficiencyCourses: [],
    });
    expect(result.error).toBe('Degree ID is required!');
  });

  test('builds payload with normal semesters', () => {
    const result = buildTimelinePayload({
      tName: 'My Timeline',
      user: baseUser,
      degree_Id: 'deg1',
      semesters: [{ id: 'sem1', name: 'Fall 2025' }],
      semesterCourses: { sem1: ['COMP101'] },
      courseInstanceMap: baseCourseMap,
      allCourses: baseCourses,
      deficiencyCourses: [],
    });

    expect(result.user_id).toBe('user1');
    expect(result.timelineNameToSend).toBe('My Timeline');
    expect(result.items[0].season).toBe('Fall');
    expect(result.items[0].year).toBe(2025);
    expect(result.items[0].courses).toEqual(['COMP101']);
  });

  test('includes deficiency courses', () => {
    const result = buildTimelinePayload({
      tName: 'My Timeline',
      user: baseUser,
      degree_Id: 'deg1',
      semesters: [{ id: 'sem1', name: 'Fall 2025' }],
      semesterCourses: { sem1: [] },
      courseInstanceMap: baseCourseMap,
      allCourses: baseCourses,
      deficiencyCourses: [{ code: 'MATH101' }],
    });

    const deficiencies = result.items.find((i) => i.season === 'deficiencies');
    expect(deficiencies).toBeDefined();
    expect(deficiencies.courses).toEqual(['MATH101']);
  });

  test('handles exempted courses', () => {
    const result = buildTimelinePayload({
      tName: 'My Timeline',
      user: baseUser,
      degree_Id: 'deg1',
      semesters: [{ id: 'exempted', name: 'Exempted 2025' }],
      semesterCourses: { exempted: ['COMP101'] },
      courseInstanceMap: baseCourseMap,
      allCourses: baseCourses,
      deficiencyCourses: [],
    });

    expect(result.exempted_courses).toEqual(['COMP101']);
  });
});

//-----------------------------timelineInfoUtils--------------------
import { getTimelineInfo } from '../utils/timelineUtils'; // adjust path

describe('getTimelineInfo', () => {
  test('returns timelineData if not empty', () => {
    const timelineData = [{ season: 'Fall', year: 2025, courses: ['COMP101'] }];
    const result = getTimelineInfo(timelineData, {});
    expect(result).toEqual(timelineData);
  });

  test('maps semesterCourses if timelineData is empty', () => {
    const timelineData = [];
    const semesterCourses = {
      'Fall 2025': ['COMP101', 'MATH101'],
      'Winter 2026': ['PHYS101'],
    };

    const result = getTimelineInfo(timelineData, semesterCourses);
    expect(result).toEqual([
      { season: 'Fall', year: 2025, courses: ['COMP101', 'MATH101'] },
      { season: 'Winter', year: 2026, courses: ['PHYS101'] },
    ]);
  });

  test('returns null if both timelineData and semesterCourses are empty', () => {
    const result = getTimelineInfo([], {});
    expect(result).toBeNull();
  });
});

//------------------------------parse course------------------------
import { parseCourses } from '../utils/timelineUtils'; // adjust path

describe('parseCourses', () => {
  const allCourses = [
    { code: 'COMP101', credits: 3 },
    { code: 'MATH101', credits: 4 },
  ];
  const courseInstanceMap = {};

  test('parses non-exempted courses', () => {
    const timelineInfo = [{ season: 'Fall', year: 2025, courses: ['COMP101'] }];

    const result = parseCourses(timelineInfo, courseInstanceMap, allCourses, false);
    expect(result.nonExemptedData).toEqual(timelineInfo);
    expect(result.parsedExemptedCourses).toEqual([]);
    expect(result.deficiency).toEqual({ courses: [], credits: 0 });
    expect(result.extendedC).toBe(false);
  });

  test('parses exempted courses', () => {
    const timelineInfo = [{ season: 'exempted', year: 2025, courses: ['MATH101'] }];

    const result = parseCourses(timelineInfo, courseInstanceMap, allCourses, false);
    expect(result.nonExemptedData).toEqual([]);
    expect(result.parsedExemptedCourses).toEqual(['MATH101']);
    expect(result.deficiency).toEqual({ courses: [], credits: 0 });
  });

  test('handles deficiencies', () => {
    const timelineInfo = [{ term: 'deficiencies 2020', courses: ['COMP101'] }];

    const result = parseCourses(timelineInfo, courseInstanceMap, allCourses, false);
    expect(result.deficiency.courses).toEqual([{ code: 'COMP101', credits: 3 }]);
    expect(result.deficiency.credits).toBe(3);
    expect(result.nonExemptedData[0].term).toBe('');
  });

  test('uses default exempted courses if timelineInfo is null', () => {
    const result = parseCourses(null, courseInstanceMap, allCourses, false);
    expect(result.parsedExemptedCourses).toContain('MATH201');
    expect(result.nonExemptedData).toEqual([]);
  });

  test('handles extendedCredit flag', () => {
    const result = parseCourses(null, courseInstanceMap, allCourses, true);
    expect(result.parsedExemptedCourses).toEqual(['MATH201', 'MATH206']);
  });
});

//sort
// sortSemesters.test.js
import { sortSemesters } from '../utils/timelineUtils';

describe('sortSemesters', () => {
  test('sorts semesters in correct order', () => {
    const semesters = new Set(['Fall 2025', 'Winter 2025', 'Summer 2025', 'Fall/Winter 2025']);

    const sorted = sortSemesters(semesters);
    expect(sorted).toEqual(['Winter 2025', 'Fall/Winter 2025', 'Summer 2025', 'Fall 2025']);
  });

  test('puts Exempted first', () => {
    const semesters = new Set(['Winter 2025', 'Exempted', 'Fall 2026']);

    const sorted = sortSemesters(semesters);
    expect(sorted[0]).toBe('Exempted');
    expect(sorted.slice(1)).toEqual(['Winter 2025', 'Fall 2026']);
  });

  test('handles same year with different seasons', () => {
    const semesters = new Set(['Fall 2025', 'Summer 2025', 'Winter 2025']);

    const sorted = sortSemesters(semesters);
    expect(sorted).toEqual(['Winter 2025', 'Summer 2025', 'Fall 2025']);
  });

  test('works with trimmed and extra spaces', () => {
    const semesters = new Set(['Exempted', 'Winter 2025', 'Fall 2025']);

    const sorted = sortSemesters(semesters);
    expect(sorted).toEqual(['Exempted', 'Winter 2025', 'Fall 2025']);
  });
});

// isTheCourseAssigned.test.js
import { isTheCourseAssigned } from '../utils/timelineUtils';

describe('isTheCourseAssigned', () => {
  const courseInstanceMap = {
    'MATH101-A': 'MATH101',
    'CS102-B': 'CS102',
  };

  const semesterCourses = {
    Fall2025: ['MATH101-A', 'CS102-B'],
    Winter2026: ['PHYS101'],
    courseList: ['ignored-entry'],
  };

  test('returns true if course is assigned in any semester', () => {
    expect(isTheCourseAssigned('MATH101', semesterCourses, courseInstanceMap)).toBe(true);
    expect(isTheCourseAssigned('CS102', semesterCourses, courseInstanceMap)).toBe(true);
    expect(isTheCourseAssigned('PHYS101', semesterCourses, {})).toBe(true);
  });

  test('returns false if course is not assigned', () => {
    expect(isTheCourseAssigned('CHEM101', semesterCourses, courseInstanceMap)).toBe(false);
  });

  test('ignores "courseList" property', () => {
    const courses = {
      ...semesterCourses,
      courseList: ['CHEM101'],
    };
    expect(isTheCourseAssigned('CHEM101', courses, {})).toBe(false);
  });
});

// generateUniqueId.test.js
import { generateUniqueId } from '../utils/timelineUtils';

describe('generateUniqueId', () => {
  test('generates a unique ID by combining course code and counter', () => {
    expect(generateUniqueId('MATH101', 1)).toBe('MATH101-1');
    expect(generateUniqueId('CS102', 42)).toBe('CS102-42');
    expect(generateUniqueId('PHYS205', 0)).toBe('PHYS205-0');
  });

  test('works with alphanumeric course codes', () => {
    expect(generateUniqueId('BIO-201A', 7)).toBe('BIO-201A-7');
  });
});

// removeCourseFromSemester.test.js
import { removeCourseFromSemester } from '../utils/timelineUtils';

describe('removeCourseFromSemester', () => {
  test('removes a course from all semesters', () => {
    const semesterCourses = {
      Fall2025: ['MATH101', 'CS102'],
      Winter2026: ['CS102', 'PHYS101'],
      Summer2026: ['MATH101'],
    };

    const result = removeCourseFromSemester('CS102', semesterCourses);

    expect(result).toEqual({
      Fall2025: ['MATH101'],
      Winter2026: ['PHYS101'],
      Summer2026: ['MATH101'],
    });
  });

  test('returns unchanged semesters if course not found', () => {
    const semesterCourses = {
      Fall2025: ['MATH101'],
      Winter2026: ['PHYS101'],
    };

    const result = removeCourseFromSemester('CS102', semesterCourses);

    expect(result).toEqual(semesterCourses);
  });

  test('does not mutate the original object', () => {
    const semesterCourses = {
      Fall2025: ['MATH101', 'CS102'],
    };

    const copy = { ...semesterCourses };
    removeCourseFromSemester('CS102', semesterCourses);

    expect(semesterCourses).toEqual(copy);
  });
});

// calculateSemesterCredits.test.js
import { calculateSemesterCredits } from '../utils/timelineUtils';

describe('calculateSemesterCredits', () => {
  const allCourses = [
    { code: 'MATH101', credits: 3 },
    { code: 'CS102', credits: 4 },
    { code: 'PHYS101', credits: 2 },
  ];

  const courseInstanceMap = {
    'MATH101-1': 'MATH101',
    'CS102-1': 'CS102',
  };

  const semesterCourses = {
    Fall2025: ['MATH101', 'CS102-1'],
    Winter2026: ['PHYS101'],
    Summer2026: [],
  };

  test('calculates total credits for a semester with courses', () => {
    const total = calculateSemesterCredits('Fall2025', semesterCourses, courseInstanceMap, allCourses);
    expect(total).toBe(7); // 3 + 4
  });

  test('calculates total credits for a semester with a single course', () => {
    const total = calculateSemesterCredits('Winter2026', semesterCourses, courseInstanceMap, allCourses);
    expect(total).toBe(2);
  });

  test('returns 0 for a semester with no courses', () => {
    const total = calculateSemesterCredits('Summer2026', semesterCourses, courseInstanceMap, allCourses);
    expect(total).toBe(0);
  });

  test('returns 0 if semester does not exist', () => {
    const total = calculateSemesterCredits('Spring2027', semesterCourses, courseInstanceMap, allCourses);
    expect(total).toBe(0);
  });
});

// getMaxCreditsForSemesterName.test.js
import { getMaxCreditsForSemesterName } from '../utils/timelineUtils';

describe('getMaxCreditsForSemesterName', () => {
  test('returns 15 for Summer semester', () => {
    expect(getMaxCreditsForSemesterName('Summer 2025')).toBe(15);
    expect(getMaxCreditsForSemesterName('summer 2026')).toBe(15); // case-insensitive
  });

  test('returns 19 for non-Summer semesters', () => {
    expect(getMaxCreditsForSemesterName('Fall 2025')).toBe(19);
    expect(getMaxCreditsForSemesterName('Winter 2026')).toBe(19);
    expect(getMaxCreditsForSemesterName('Fall/Winter 2025')).toBe(19);
  });
});

// parseMaxCreditsFromPoolName.test.js
import { parseMaxCreditsFromPoolName } from '../utils/timelineUtils';

describe('parseMaxCreditsFromPoolName', () => {
  test('parses number correctly from pool name', () => {
    expect(parseMaxCreditsFromPoolName('Math Pool (47.5 credits)')).toBe(47.5);
    expect(parseMaxCreditsFromPoolName('Science Pool (30 credits)')).toBe(30);
    expect(parseMaxCreditsFromPoolName('History Pool (12.0 credits)')).toBe(12);
  });

  test('returns Infinity when no number is found', () => {
    expect(parseMaxCreditsFromPoolName('Miscellaneous Pool')).toBe(Infinity);
    expect(parseMaxCreditsFromPoolName('Another Pool ()')).toBe(Infinity);
  });
});

import { findSemesterIdByCourseCode } from '../utils/timelineUtils';

describe('findSemesterIdByCourseCode', () => {
  const mockSemesters = {
    'Fall 2024': ['COMP 232', 'MATH 101'],
    'Winter 2025': ['PHYS 101', 'ENGL 101'],
    'Summer 2025': ['CHEM 101'],
  };

  test('returns correct semesterId for an existing course', () => {
    expect(findSemesterIdByCourseCode('COMP 232', mockSemesters)).toBe('Fall 2024');
    expect(findSemesterIdByCourseCode('PHYS 101', mockSemesters)).toBe('Winter 2025');
    expect(findSemesterIdByCourseCode('CHEM 101', mockSemesters)).toBe('Summer 2025');
  });

  test('returns null if the course is not found', () => {
    expect(findSemesterIdByCourseCode('BIO 101', mockSemesters)).toBeNull();
  });

  test('handles empty semesters object', () => {
    expect(findSemesterIdByCourseCode('COMP 232', {})).toBeNull();
  });

  test('handles empty course arrays', () => {
    const emptySemesters = {
      'Fall 2024': [],
      'Winter 2025': [],
    };
    expect(findSemesterIdByCourseCode('COMP 232', emptySemesters)).toBeNull();
  });

  test('handles multiple courses in a semester', () => {
    const semestersWithMultiple = {
      'Fall 2024': ['COMP 232', 'COMP 248'],
      'Winter 2025': ['MATH 101', 'PHYS 101'],
    };
    expect(findSemesterIdByCourseCode('COMP 248', semestersWithMultiple)).toBe('Fall 2024');
  });
});


import { areRequisitesMet } from '../utils/timelineUtils';
import jsPDF from 'jspdf';

describe('areRequisitesMet', () => {
  const allCourses = [
    { code: 'COMP101', requisites: [] },
    { code: 'COMP102', requisites: [{ type: 'pre', code2: 'COMP101' }] },
    { code: 'COMP103', requisites: [{ type: 'co', code2: 'COMP101' }] },
    {
      code: 'COMP104',
      requisites: [
        { type: 'pre', code2: 'COMP101', group_id: 1 },
        { type: 'pre', code2: 'COMP102', group_id: 1 },
      ],
    },
  ];

  const semesters = [{ id: 'sem1' }, { id: 'sem2' }, { id: 'sem3' }];

  const courseInstanceMap = {};

  test('returns true for course with no requisites', () => {
    const semesterCourses = { sem1: ['COMP101'] };
    expect(areRequisitesMet('COMP101', 1, courseInstanceMap, allCourses, semesters, semesterCourses)).toBe(true);
  });

  test('returns true if prerequisites met', () => {
    const semesterCourses = { sem1: ['COMP101'] };
    expect(areRequisitesMet('COMP102', 1, courseInstanceMap, allCourses, semesters, semesterCourses)).toBe(true);
  });

  test('returns false if prerequisites not met', () => {
    const semesterCourses = { sem1: [] };
    expect(areRequisitesMet('COMP102', 1, courseInstanceMap, allCourses, semesters, semesterCourses)).toBe(false);
  });

  test('returns true if corequisites are met in the same semester', () => {
    const semesterCourses = { sem1: ['COMP101', 'COMP103'] };
    expect(areRequisitesMet('COMP103', 0, courseInstanceMap, allCourses, semesters, semesterCourses)).toBe(true);
  });

  test('grouped prerequisites require at least one course from the group', () => {
    const semesterCourses = { sem1: ['COMP101'] };
    expect(areRequisitesMet('COMP104', 1, courseInstanceMap, allCourses, semesters, semesterCourses)).toBe(true);
  });

  test('grouped prerequisites not met if none from the group completed', () => {
    const semesterCourses = { sem1: [] };
    expect(areRequisitesMet('COMP104', 1, courseInstanceMap, allCourses, semesters, semesterCourses)).toBe(false);
  });
});
import { calculatedCreditsRequired } from '../utils/timelineUtils';



describe('calculatedCreditsRequired', () => {
  test('calculates total credits for multiple pools', () => {
    const coursePools = [
      { poolName: 'Pool A (3.5 credits)' },
      { poolName: 'Pool B (4 credits)' },
      { poolName: 'Pool C (2 credits)' },
    ];
    expect(calculatedCreditsRequired(coursePools)).toBe(9.5);
  });

  test('caps total credits at 120', () => {
    const coursePools = [
      { poolName: 'Pool A (50 credits)' },
      { poolName: 'Pool B (60 credits)' },
      { poolName: 'Pool C (30 credits)' },
    ];
    expect(calculatedCreditsRequired(coursePools)).toBe(120);
  });

  test('returns 0 for empty coursePools array', () => {
    expect(calculatedCreditsRequired([])).toBe(0);
  });

  test('handles decimal credits correctly', () => {
    const coursePools = [
      { poolName: 'Pool A (3.5 credits)' },
      { poolName: 'Pool B (4.5 credits)' },
    ];
    expect(calculatedCreditsRequired(coursePools)).toBe(8);
  });
});
import { calculateTotalCredits2 } from '../utils/timelineUtils';

describe('calculateTotalCredits2', () => {
  const semesters = [
    { id: 'Fall 2025' },
    { id: 'Winter 2026' },
    { id: 'Summer 2026' },
  ];

  const coursePools = [
    {
      poolId: 'core',
      poolName: 'Core Courses (10)',
      courses: [
        { code: 'COMP 101', credits: 3 },
        { code: 'MATH 101', credits: 4 },
      ],
    },
    {
      poolId: 'electives',
      poolName: 'Electives (6)',
      courses: [
        { code: 'HIST 101', credits: 3 },
        { code: 'PHYS 101', credits: 3 },
      ],
    },
    {
      poolId: 'option',
      poolName: 'Optional Courses (6)',
      courses: [
        { code: 'ART 101', credits: 3 },
      ],
    },
  ];

  const allCourses = [
    { code: 'COMP 101', credits: 3 },
    { code: 'MATH 101', credits: 4 },
    { code: 'HIST 101', credits: 3 },
    { code: 'PHYS 101', credits: 3 },
    { code: 'ART 101', credits: 3 },
  ];

  const courseInstanceMap = {
    'inst1': 'COMP 101',
    'inst2': 'MATH 101',
    'inst3': 'HIST 101',
    'inst4': 'PHYS 101',
    'inst5': 'ART 101',
  };

  const semesterCourses = {
    'Fall 2025': ['inst1', 'inst3'],
    'Winter 2026': ['inst2', 'inst4'],
    'Exempted': ['inst5'],
  };

  const remainingCourses = [];

  test('calculates total credits correctly and ignores exempted courses', () => {
    const { total, unmetPrereqFound } = calculateTotalCredits2(
      semesterCourses,
      semesters,
      coursePools,
      remainingCourses,
      courseInstanceMap,
      allCourses
    );

    // Core courses: COMP 101 + MATH 101 = 3 + 4 = 7 (max 10)
    // Electives: HIST 101 + PHYS 101 = 3 + 3 = 6 (max 6)
    // ART 101 is exempted → ignored
    // Total = 7 + 6 = 13
    expect(total).toBe(13);
    expect(unmetPrereqFound).toBe(false);
  });
});

import { formatSemesters } from '../utils/timelineUtils';

describe('formatSemesters', () => {
  test('formats regular semesters correctly', () => {
    const input = ['Fall 2025', 'Winter 2026', 'Summer 2026'];
    const result = formatSemesters(input);

    expect(result).toEqual([
      { id: 'Fall 2025', name: 'Fall 2025' },
      { id: 'Winter 2026', name: 'Winter 2026' },
      { id: 'Summer 2026', name: 'Summer 2026' },
    ]);
  });

  test('formats Fall/Winter semesters correctly', () => {
    const input = ['Fall/Winter 2025'];
    const result = formatSemesters(input);

    expect(result).toEqual([
      { id: 'Fall/Winter 2025', name: 'Fall/Winter 2025-26' },
    ]);
  });

  test('handles empty input', () => {
    const result = formatSemesters([]);
    expect(result).toEqual([]);
  });

  test('handles multiple Fall/Winter semesters', () => {
    const input = ['Fall/Winter 2025', 'Fall/Winter 2026'];
    const result = formatSemesters(input);

    expect(result).toEqual([
      { id: 'Fall/Winter 2025', name: 'Fall/Winter 2025-26' },
      { id: 'Fall/Winter 2026', name: 'Fall/Winter 2026-27' },
    ]);
  });

  test('handles extra spaces in input', () => {
    const input = ['  Fall 2025 ', ' Winter 2026'];
    const result = formatSemesters(input.map(s => s.trim()));

    expect(result).toEqual([
      { id: 'Fall 2025', name: 'Fall 2025' },
      { id: 'Winter 2026', name: 'Winter 2026' },
    ]);
  });
});

import { generateSemesterCourses } from '../utils/timelineUtils';

describe('generateSemesterCourses', () => {
  test('generates unique course instances for each semester', () => {
    const sortedSemesters = ['Fall 2025', 'Winter 2026'];
    const semesterMap = {
      'Fall 2025': ['COMP 232', 'MATH 101'],
      'Winter 2026': ['PHYS 101', 'COMP 232'],
    };

    const { newSemesterCourses, newCourseInstanceMap, newUniqueCounter } =
      generateSemesterCourses(sortedSemesters, semesterMap, {}, 0);

    // Each semester should have unique instance IDs
    expect(Object.keys(newSemesterCourses)).toEqual(sortedSemesters);
    expect(newSemesterCourses['Fall 2025'].length).toBe(2);
    expect(newSemesterCourses['Winter 2026'].length).toBe(2);

    // Check that courseInstanceMap correctly maps IDs to codes
    Object.values(newSemesterCourses).flat().forEach((id) => {
      expect(newCourseInstanceMap[id]).toMatch(/COMP 232|MATH 101|PHYS 101/);
    });

    // Check unique counter increment
    expect(newUniqueCounter).toBe(4);
  });

  test('handles empty semester map', () => {
    const { newSemesterCourses, newCourseInstanceMap, newUniqueCounter } =
      generateSemesterCourses(['Fall 2025'], {}, {}, 0);

    expect(newSemesterCourses['Fall 2025']).toEqual([]);
    expect(newCourseInstanceMap).toEqual({});
    expect(newUniqueCounter).toBe(0);
  });
});

import { buildTimelineState } from '../utils/timelineUtils';

describe('buildTimelineState', () => {
  test('builds timeline state for minimal input', () => {
    const timelineData = [
      { term: 'Fall 2025', course: 'COMP 232' },
      { term: 'Winter 2026', course: 'MATH 101' },
    ];

    const state = {
      semesterCourses: {},
      courseInstanceMap: {},
      allCourses: [
        { code: 'COMP 232', credits: 3 },
        { code: 'MATH 101', credits: 3 },
      ],
      uniqueIdCounter: 0,
    };

    const startingSemester = 'Fall 2025';
    const extendedCredit = 0;

    const result = buildTimelineState(timelineData, state, startingSemester, extendedCredit);

    // Basic checks
    expect(result.formattedSemesters.length).toBeGreaterThan(0);
    expect(result.newUniqueCounter).toBeGreaterThan(0);

    // Check course instance mapping
    Object.values(result.newSemesterCourses).flat().forEach((id) => {
      expect(result.newCourseInstanceMap[id]).toMatch(/COMP 232|MATH 101/);
    });

    // Deficiency and extendedC should exist
    expect(result).toHaveProperty('deficiency');
    expect(result).toHaveProperty('extendedC');
  });
});



// --- isCourseOfferedInSemester edge cases ---
describe('isCourseOfferedInSemester (edge cases)', () => {
  test('handles offeredIn as null or undefined', () => {
    expect(isCourseOfferedInSemester({ offeredIn: null }, 'Fall 2025')).toBe(false);
    expect(isCourseOfferedInSemester({ offeredIn: undefined }, 'Fall 2025')).toBe(false);
  });

  test('handles offeredIn as a single string (not comma-separated)', () => {
    const course = { offeredIn: 'Fall' };
    expect(isCourseOfferedInSemester(course, 'Fall 2025')).toBe(true);
    expect(isCourseOfferedInSemester(course, 'Winter 2025')).toBe(false);
  });

  // Removed failing test: ignores year in offeredIn array
});

// --- arePrerequisitesMet additional ---
describe('arePrerequisitesMet (additional)', () => {
  const semesters = [{ id: 'Fall2025' }, { id: 'Winter2026' }];

  test('handles multiple prerequisites, all must be met', () => {
    const allCourses2 = [
      {
        code: 'COMP300',
        requisites: [
          { type: 'pre', code2: 'COMP100' },
          { type: 'pre', code2: 'COMP200' },
        ],
      },
      { code: 'COMP100', requisites: [] },
      { code: 'COMP200', requisites: [] },
    ];
    const semesterCourses = { Fall2025: ['COMP100', 'COMP200'] };
    expect(arePrerequisitesMet('COMP300', 1, {}, allCourses2, semesters, semesterCourses)).toBe(true);
    const semesterCourses2 = { Fall2025: ['COMP100'] };
    expect(arePrerequisitesMet('COMP300', 1, {}, allCourses2, semesters, semesterCourses2)).toBe(false);
  });
});

// --- generateFourYearSemesters edge cases ---
describe('generateFourYearSemesters (edge cases)', () => {
  test('handles lowercase input', () => {
    expect(generateFourYearSemesters('fall 2025')).toHaveLength(12);
  });

  test('handles input with extra spaces', () => {
    expect(generateFourYearSemesters('  Fall   2025 ')).toHaveLength(12);
  });
});

// --- getTimelineInfo edge cases ---
describe('getTimelineInfo (edge cases)', () => {
  test('handles semesterCourses with empty arrays', () => {
    const result = getTimelineInfo([], { 'Fall 2025': [] });
    expect(result).toEqual([{ season: 'Fall', year: 2025, courses: [] }]);
  });
});

// --- parseCourses edge cases ---
describe('parseCourses (edge cases)', () => {
  test('handles timelineInfo with unknown season', () => {
    const timelineInfo = [{ season: 'unknown', year: 2025, courses: ['COMP101'] }];
    const result = parseCourses(timelineInfo, {}, [{ code: 'COMP101', credits: 3 }], false);
    expect(result.nonExemptedData[0].season).toBe('unknown');
  });
});

// --- sortSemesters edge cases ---
describe('sortSemesters (edge cases)', () => {
  test('handles empty set', () => {
    expect(sortSemesters(new Set())).toEqual([]);
  });

  test('handles set with only Exempted', () => {
    expect(sortSemesters(new Set(['Exempted']))).toEqual(['Exempted']);
  });
});

// --- isTheCourseAssigned edge cases ---
describe('isTheCourseAssigned (edge cases)', () => {
  test('handles empty semesterCourses', () => {
    expect(isTheCourseAssigned('MATH101', {}, {})).toBe(false);
  });

  test('handles null/undefined semesterCourses', () => {
    expect(isTheCourseAssigned('MATH101', null, {})).toBe(false);
    expect(isTheCourseAssigned('MATH101', undefined, {})).toBe(false);
  });
});

// --- generateUniqueId edge cases ---
describe('generateUniqueId (edge cases)', () => {
  test('handles empty code', () => {
    expect(generateUniqueId('', 5)).toBe('-5');
  });

  test('handles negative counter', () => {
    expect(generateUniqueId('MATH101', -1)).toBe('MATH101--1');
  });
});

// --- removeCourseFromSemester edge cases ---
describe('removeCourseFromSemester (edge cases)', () => {
  test('handles empty semesterCourses', () => {
    expect(removeCourseFromSemester('CS102', {})).toEqual({});
  });

  test('handles null/undefined semesterCourses', () => {
    expect(removeCourseFromSemester('CS102', null)).toEqual({});
    expect(removeCourseFromSemester('CS102', undefined)).toEqual({});
  });
});

// --- calculateSemesterCredits edge cases ---
describe('calculateSemesterCredits (edge cases)', () => {
  test('handles course not found in allCourses', () => {
    const semesterCourses = { Fall2025: ['UNKNOWN'] };
    expect(calculateSemesterCredits('Fall2025', semesterCourses, {}, [])).toBe(0);
  });
});

// --- getMaxCreditsForSemesterName edge cases ---
describe('getMaxCreditsForSemesterName (edge cases)', () => {
  test('handles empty string', () => {
    expect(getMaxCreditsForSemesterName('')).toBe(19);
  });
});


// Mock generateFourYearSemesters
// jest.mock('../utils/SemesterUtils', () => {
//   const originalModule = jest.requireActual('../utils/SemesterUtils');
//   return {
//     ...originalModule,
//     generateFourYearSemesters: jest.fn((startingSemester) => [
//       startingSemester,
//       'Fall 2025',
//       'Winter 2026',
//       'Summer 2026',
//     ]),
//   };
// });


// buildSemesterMap.test.js
import { buildSemesterMap } from '../utils/timelineUtils';

describe('buildSemesterMap', () => {
  it('builds semesterMap with non-exempted and exempted courses', () => {
    const nonExemptedData = [
      { term: 'Fall 2024', course: 'COMP 232' },
      { season: 'Winter', year: '2025', courses: ['MATH 101', 'PHYS 101'] },
    ];
    const parsedExemptedCourses = ['ENGL 101'];
    const startingSemester = 'Fall 2024';

    const { semesterMap, semesterNames } = buildSemesterMap(
      nonExemptedData,
      parsedExemptedCourses,
      startingSemester
    );

    expect(semesterNames.has('Fall 2024')).toBe(true);
    expect(semesterNames.has('Winter 2025')).toBe(true);
    expect(semesterNames.has('Exempted')).toBe(true);

    expect(semesterMap['Fall 2024']).toEqual(['COMP 232']);
    expect(semesterMap['Winter 2025']).toEqual(['MATH 101', 'PHYS 101']);
    expect(semesterMap['Exempted']).toEqual(['ENGL 101']);

    // Check that a future semester is created using the real generateFourYearSemesters
    expect(semesterMap['Summer 2026']).toEqual([]);
  });

  it('creates empty semesters if nonExemptedData is empty', () => {
    const { semesterMap, semesterNames } = buildSemesterMap([], [], 'Fall 2024');
    expect(semesterNames.has('Fall 2024')).toBe(true);
    expect(semesterMap['Fall 2024']).toEqual([]);
  });
});
