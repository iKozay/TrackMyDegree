const { mapCoursesToTimelineFormat } = require('../services/timeline/courseMapper');

describe('courseMapper', () => {
  test('maps course object to timeline format and uses overrides', () => {
    const courses = {
      'COMP 101': {
        _id: 'COMP 101',
        title: 'Intro',
        credits: 3,
        description: 'desc',
        offeredIn: ['FALL'],
        rules: [
          {type: 'prerequisite', params: { courseList: ['MATH 100'], minCourses: 1 }, message: "At least 1 of the following courses must be completed previously: MATH 100"}
        ],
      },
    };
    const statusMap = {
      'COMP 101': { status: 'completed', semester: 'FALL 2023' },
    };

    const mapped = mapCoursesToTimelineFormat(courses, statusMap);
    expect(mapped['COMP 101'].id).toBe('COMP 101');
    expect(mapped['COMP 101'].title).toBe('Intro');
    expect(mapped['COMP 101'].status.status).toBe('completed');
    expect(mapped['COMP 101'].prerequisites[0].anyOf).toContain('MATH 100');
  });
});
