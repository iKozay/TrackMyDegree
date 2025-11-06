const { spawn } = require('child_process');
const scraper = require('../course-data/Scraping/Scrapers/runScraper');
const { Buffer } = require('buffer');

jest.mock('child_process');

describe('runScraper', () => {
    const mockSpawn = spawn;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('resolves with parsed JSON output', async () => {
        const mockStdout = {
            on: jest.fn().mockImplementation((event, cb) => {
                if (event === 'data') cb(Buffer.from('[{"course":"TEST"}]'));
            }),
        };
        const mockProcess = {
            stdout: mockStdout,
            stderr: { on: jest.fn() },
            on: jest.fn().mockImplementation((event, cb) => {
                if (event === 'close') cb(0);
            }),
        };

        mockSpawn.mockReturnValue(mockProcess);

        const result = await scraper.runScraper('Software Engineering');
        expect(result).toEqual([{ course: 'TEST' }]);
    });

    it('rejects if degree name is invalid', async () => {
        await expect(scraper.runScraper('Unknown Degree')).rejects.toThrow(
            'Degree name "Unknown Degree" not found'
        );
    });

    it('rejects if Python exits with error code', async () => {
        const mockProcess = {
            stdout: { on: jest.fn() },
            stderr: { on: jest.fn().mockImplementation((event, cb) => { if (event === 'data') cb(Buffer.from('error')); }) },
            on: jest.fn().mockImplementation((event, cb) => {
                if (event === 'close') cb(1);
            }),
        };

        mockSpawn.mockReturnValue(mockProcess);

        await expect(scraper.runScraper('Software Engineering')).rejects.toThrow('Scraper failed: error');
    });

    it('rejects if JSON parsing fails', async () => {
        const mockStdout = {
            on: jest.fn().mockImplementation((event, cb) => {
                if (event === 'data') cb(Buffer.from('invalid json'));
            }),
        };
        const mockProcess = {
            stdout: mockStdout,
            stderr: { on: jest.fn() },
            on: jest.fn().mockImplementation((event, cb) => {
                if (event === 'close') cb(0);
            }),
        };

        mockSpawn.mockReturnValue(mockProcess);

        await expect(scraper.runScraper('Software Engineering')).rejects.toThrow('Failed to parse Python output as JSON');
    });
});
