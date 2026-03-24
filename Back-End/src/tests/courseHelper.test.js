const { normalizeCourseCode, validateGrade, isPlaceholderCourse } = require('../services/timeline/courseHelper');

describe('courseHelper', () => {
  test('normalizeCourseCode adds space and uppercases', () => {
    expect(normalizeCourseCode(' engr   201 ')).toBe('ENGR 201');
    expect(normalizeCourseCode('ENGR201')).toBe('ENGR 201');
    expect(normalizeCourseCode('math100')).toBe('MATH 100');
    expect(normalizeCourseCode('ABC')).toBe('ABC');
  });

  test('validateGrade works for various cases', () => {
    expect(validateGrade('C-', 'C')).toBe(true);
    expect(validateGrade('C-', 'D')).toBe(false);
    expect(validateGrade('D-', undefined)).toBe(true); // no grade => assume pass/in progress
    expect(validateGrade('C-', 'EX')).toBe(true);
    expect(validateGrade('C-', 'DISC')).toBe(false);
  });

  test('isPlaceholderCourse identifies placeholders', () => {
    expect(isPlaceholderCourse('Elective - choose one')).toBe(true);
    expect(isPlaceholderCourse('General elective')).toBe(true);
    expect(isPlaceholderCourse('CHEM 101')).toBe(false);
  });
});
