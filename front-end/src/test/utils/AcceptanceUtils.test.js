import { parsePdfFile, extractAcceptanceDetails } from '../AcceptanceUtils.js'; // adjust path
import { pdfjs } from 'react-pdf';

// Mock PDF.js getDocument
jest.mock('react-pdf', () => ({
  pdfjs: {
    getDocument: jest.fn(),
    GlobalWorkerOptions: {},
    version: '3.9.179', // Example version
  },
}));

describe('PDF parsing and acceptance details', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('parsePdfFile', () => {
    it('should resolve with text from PDF', async () => {
      const fakeFile = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });

      const mockPage = {
        getTextContent: jest.fn().mockResolvedValue({
          items: [{ str: 'Page 1 text' }, { str: 'Page 2 text' }],
        }),
      };

      const mockPdf = {
        numPages: 2,
        getPage: jest.fn().mockResolvedValue(mockPage),
      };

      pdfjs.getDocument.mockReturnValue({ promise: Promise.resolve(mockPdf) });

      const result = await parsePdfFile(fakeFile);
      expect(result).toContain('Page 1 text');
      expect(result).toContain('Page 2 text');
      expect(pdfjs.getDocument).toHaveBeenCalled();
    });
    it('rejects on FileReader error', async () => {
      const file = new Blob(['invalid pdf content'], { type: 'application/pdf' });

      // Mock FileReader to immediately trigger error
      const originalFileReader = global.FileReader;
      global.FileReader = class {
        readAsArrayBuffer() {
          setTimeout(() => this.onerror(new Error('mock error')));
        }
      };

      await expect(parsePdfFile(file)).rejects.toThrow('mock error');

      global.FileReader = originalFileReader; // restore original
    });
  });

  describe('extractAcceptanceDetails', () => {
    it('should extract degree and courses correctly', () => {
      const sampleText = `
        OFFER OF ADMISSION
        Program/Plan(s): Computer Science Extended Credit Program
        Academic Load
        Co-op Recommendation: Congratulations!
        Session: Fall 2023
        Expected Graduation Term: Winter 2025
        Admission Status: Final
        Minimum Program Length: 120 credits
        Exemptions: COMM 101, ECON 201
        Deficiencies: MATH 100
        Transfer Credits: PHYS 101
        ADDITIONAL INFORMATION
      `;

      const { results, details } = extractAcceptanceDetails(sampleText);

      expect(details.degreeConcentration).toContain('Computer Science');
      expect(details.coopProgram).toBe(true);
      expect(details.startingTerm).toBe('Fall 2023');
      expect(details.expectedGraduationTerm).toBe('Winter 2025');
      expect(details.minimumProgramLength).toBe('120');

      // Check that courses are extracted
      expect(results).toEqual(
        expect.arrayContaining([
          { term: 'Exempted', courses: ['COMM101', 'ECON201'] },
          { term: 'Deficiencies', courses: ['MATH100'] },
          { term: 'Transfered Courses', courses: ['PHYS101'] },
        ]),
      );
    });

    it('should return some semesters even if the end year is not found', () => {
      const sampleText = `
        OFFER OF ADMISSION
        Program/Plan(s): Computer Science Extended Credit Program
        Session: Fall 2023
        Minimum Program Length: 120 credits
      `;

      const { results, details } = extractAcceptanceDetails(sampleText);

      // Check that courses are extracted
      expect(results).toEqual(expect.arrayContaining([{ term: 'Fall 2023', course: '' }]));
    });

    it('should return empty results if text is empty', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(jest.fn()); // suppress
      const { results, details } = extractAcceptanceDetails('');
      expect(results).toEqual([]);
      expect(details).toEqual({});
      consoleSpy.mockRestore(); // restore console
    });

    it('should alert if "OFFER OF ADMISSION" not present', () => {
      global.alert = jest.fn();
      const { results } = extractAcceptanceDetails('Some other text');
      expect(global.alert).toHaveBeenCalledWith('Please choose Offer of Admission');
      expect(results).toEqual([]);
    });
  });
});
