jest.mock('pdf-parse');
jest.mock('node:timers', () => ({
  setTimeout: jest.fn(() => Math.floor(Math.random() * 10000)),
}));

const { AcceptanceLetterParser } = require('../Util/acceptanceLetterParser.ts');
describe('AcceptanceLetterParser', () => {
  const parser = new AcceptanceLetterParser();


  test('extractTermFromText should extract valid term between labels', () => {
    const text = `
      Session: Fall 2023
      Minimum Program Length: 90 credits
    `;
    const term = parser.extractTermFromText({
      text,
      startLabel: 'Session',
      endLabel: 'Minimum Program Length',
    });
    expect(term).toBe('Fall 2023');
  });

  test('getCoursesFromText should return list of matched course codes', () => {
    const text = `
      Exemptions:
      COMP 248
      ENGL 212
      Deficiencies:
    `;
    const courses = parser.getCoursesFromText({
      text,
      startLabel: 'Exemptions:',
      endLabel: 'Deficiencies:',
    });
    expect(courses).toEqual(['COMP248', 'ENGL212']);
  });

  test('generateTerms should correctly build academic terms', () => {
    const terms = parser.generateTerms('Fall 2023', 'Summer 2024');
    expect(terms).toEqual(['Fall 2023', 'Winter 2024', 'Summer 2024']);
  });


  test('parse() should extract degree, co-op flag, and terms', () => {
    const mockText = `
      Program/Plan(s): Bachelor of Commerce Major in Marketing
      Academic Load: Full-time
      Co-op Recommendation: Congratulations!
      Extended Credit Program
      Session: Fall 2023
      Minimum Program Length: 90 credits
      Expected Graduation Term: Winter 2025
      Admission Status: Admitted
      Exemptions:
      COMP 248
      MATH 203
      Deficiencies:
      COMM 212
      Transfer Credits:
      ECON 201
      ADDITIONAL INFORMATION
    `;

    const result = parser.parse(mockText);

    // ✅ details assertions
    expect(result.details.degreeConcentration).toContain('Bachelor of Commerce Major in Marketing');
    expect(result.details.coopProgram).toBe(true);
    expect(result.details.extendedCreditProgram).toBe(true);
    expect(result.details.minimumProgramLength).toBe('90');
    expect(result.details.startingTerm).toBe('Fall 2023');
    expect(result.details.expectedGraduationTerm).toBe('Winter 2025');


    const exempted = result.extractedCourses.find(c => c.term === 'Exempted');
    expect(exempted?.courses).toEqual(['COMP248', 'MATH203']);

    const deficiencies = result.extractedCourses.find(c => c.term === 'Deficiencies');
    expect(deficiencies?.courses).toEqual(['COMM212']);

    const transfer = result.extractedCourses.find(c => c.term === 'Transfered Courses');
    expect(transfer?.courses).toEqual(['ECON201']);

 
    const generatedTerms = result.extractedCourses.filter(c => c.term.match(/Fall|Winter|Summer/));
    expect(generatedTerms.length).toBeGreaterThan(0);
  });

  test('parse() should handle missing sections gracefully', () => {
    const text = `Program/Plan(s): Computer Science\nAcademic Load: Full-time`;
    const result = parser.parse(text);

    expect(result.details.degreeConcentration).toContain('Computer Science');
    expect(result.details.startingTerm).toBeNull();
    expect(result.details.expectedGraduationTerm).toBeNull();
    expect(result.extractedCourses).toHaveLength(0);
  });
});
