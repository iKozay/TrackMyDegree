const { EventEmitter } = require('events');

// Mock child_process before requiring the module
jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

const childProcess = require('child_process');

describe('runScraper', () => {
  let runScraper, degreesURL;

  beforeEach(() => {
    jest.resetAllMocks();
    
    // Use isolateModules to get fresh imports for each test
    jest.isolateModules(() => {
      const scraperModule = require('../course-data/Scraping/Scrapers/runScraper');
      runScraper = scraperModule.runScraper;
      degreesURL = scraperModule.degreesURL;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('successful scraping', () => {
    it('should resolve with parsed JSON when python script outputs valid JSON and exits with code 0', async () => {
      const fakeData = {
        degree: { _id: 'Computer Engineering', name: 'Computer Engineering' },
        course_pool: [{ _id: 'Pool1', name: 'Pool1', courses: ['COMP101'] }],
        courses: [{ _id: 'COMP101', title: 'Intro to Computing' }],
      };

      // Create fake child process
      const fakeProcess = new EventEmitter();
      fakeProcess.stdout = new EventEmitter();
      fakeProcess.stderr = new EventEmitter();

      childProcess.spawn.mockReturnValue(fakeProcess);

      // Call runScraper (returns promise)
      const promise = runScraper('Computer Engineering');

      // Simulate Python process emitting data and closing successfully
      process.nextTick(() => {
        fakeProcess.stdout.emit('data', Buffer.from(JSON.stringify(fakeData)));
        fakeProcess.emit('close', 0);
      });

      const result = await promise;

      expect(result).toEqual(fakeData);
      expect(childProcess.spawn).toHaveBeenCalledWith(
        'python',
        expect.arrayContaining([
          expect.stringContaining('degree_data_scraper.py'),
          degreesURL['Computer Engineering'],
        ])
      );
    });

    it('should handle JSON output split across multiple stdout data events', async () => {
      const fakeData = { degree: { _id: 'test' }, courses: [] };
      const jsonString = JSON.stringify(fakeData);
      const part1 = jsonString.slice(0, Math.floor(jsonString.length / 2));
      const part2 = jsonString.slice(Math.floor(jsonString.length / 2));

      const fakeProcess = new EventEmitter();
      fakeProcess.stdout = new EventEmitter();
      fakeProcess.stderr = new EventEmitter();

      childProcess.spawn.mockReturnValue(fakeProcess);

      const promise = runScraper('Mechanical Engineering');

      process.nextTick(() => {
        fakeProcess.stdout.emit('data', Buffer.from(part1));
        fakeProcess.stdout.emit('data', Buffer.from(part2));
        fakeProcess.emit('close', 0);
      });

      const result = await promise;

      expect(result).toEqual(fakeData);
    });

    it('should trim whitespace from JSON output before parsing', async () => {
      const fakeData = { degree: { _id: 'test' }, courses: [] };
      const jsonWithWhitespace = `\n\n  ${JSON.stringify(fakeData)}  \n\n`;

      const fakeProcess = new EventEmitter();
      fakeProcess.stdout = new EventEmitter();
      fakeProcess.stderr = new EventEmitter();

      childProcess.spawn.mockReturnValue(fakeProcess);

      const promise = runScraper('Electrical Engineering');

      process.nextTick(() => {
        fakeProcess.stdout.emit('data', Buffer.from(jsonWithWhitespace));
        fakeProcess.emit('close', 0);
      });

      const result = await promise;

      expect(result).toEqual(fakeData);
    });
  });

  describe('error handling', () => {
    it('should reject when degree name is not found in degreesURL map', async () => {
      await expect(runScraper('Unknown Degree')).rejects.toThrow(
        'Degree name "Unknown Degree" not found in degreesURL map.'
      );

      // spawn should not be called if degree is invalid
      expect(childProcess.spawn).not.toHaveBeenCalled();
    });

    it('should reject when python process exits with non-zero code', async () => {
      const fakeProcess = new EventEmitter();
      fakeProcess.stdout = new EventEmitter();
      fakeProcess.stderr = new EventEmitter();

      childProcess.spawn.mockReturnValue(fakeProcess);

      const promise = runScraper('Computer Engineering');

      process.nextTick(() => {
        fakeProcess.stderr.emit('data', Buffer.from('Python error: module not found'));
        fakeProcess.emit('close', 1);
      });

      await expect(promise).rejects.toThrow(/Scraper failed/);
      await expect(promise).rejects.toThrow(/module not found/);
    });

    it('should reject when python outputs invalid JSON', async () => {
      const fakeProcess = new EventEmitter();
      fakeProcess.stdout = new EventEmitter();
      fakeProcess.stderr = new EventEmitter();

      childProcess.spawn.mockReturnValue(fakeProcess);

      const promise = runScraper('Civil Engineering');

      process.nextTick(() => {
        fakeProcess.stdout.emit('data', Buffer.from('This is not valid JSON'));
        fakeProcess.emit('close', 0);
      });

      await expect(promise).rejects.toThrow(/Failed to parse Python output as JSON/);
    });

    it('should reject when python process fails to start', async () => {
      const fakeProcess = new EventEmitter();
      fakeProcess.stdout = new EventEmitter();
      fakeProcess.stderr = new EventEmitter();

      childProcess.spawn.mockReturnValue(fakeProcess);

      const promise = runScraper('Software Engineering');

      process.nextTick(() => {
        fakeProcess.emit('error', new Error('ENOENT: python command not found'));
      });

      await expect(promise).rejects.toThrow(/python command not found/);
    });

    it('should reject when python outputs to stderr even with exit code 0', async () => {
      const fakeProcess = new EventEmitter();
      fakeProcess.stdout = new EventEmitter();
      fakeProcess.stderr = new EventEmitter();

      childProcess.spawn.mockReturnValue(fakeProcess);

      const promise = runScraper('Aerospace Engineering');

      process.nextTick(() => {
        fakeProcess.stdout.emit('data', Buffer.from('{}'));
        fakeProcess.stderr.emit('data', Buffer.from('Warning: deprecated API'));
        fakeProcess.emit('close', 1); // must exit with non-zero for rejection
      });

      await expect(promise).rejects.toThrow(/Scraper failed/);
    });

    it('should reject with empty JSON when python outputs empty string', async () => {
      const fakeProcess = new EventEmitter();
      fakeProcess.stdout = new EventEmitter();
      fakeProcess.stderr = new EventEmitter();

      childProcess.spawn.mockReturnValue(fakeProcess);

      const promise = runScraper('Chemical Engineering');

      process.nextTick(() => {
        fakeProcess.stdout.emit('data', Buffer.from(''));
        fakeProcess.emit('close', 0);
      });

      await expect(promise).rejects.toThrow(/Failed to parse Python output as JSON/);
    });
  });

  describe('degreesURL mapping', () => {
    it('should have URLs for all expected degrees', () => {
      const expectedDegrees = [
        'Computer Engineering',
        'Mechanical Engineering',
        'Building Engineering',
        'Industrial Engineering',
        'Chemical Engineering',
        'Electrical Engineering',
        'Aerospace Engineering',
        'Civil Engineering',
        'Software Engineering',
      ];

      expectedDegrees.forEach((degree) => {
        expect(degreesURL[degree]).toBeDefined();
        expect(degreesURL[degree]).toMatch(/^https:\/\/www\.concordia\.ca/);
      });
    });

    it('should pass correct URL to python script based on degree name', async () => {
      const fakeProcess = new EventEmitter();
      fakeProcess.stdout = new EventEmitter();
      fakeProcess.stderr = new EventEmitter();

      childProcess.spawn.mockReturnValue(fakeProcess);

      const promise = runScraper('Building Engineering');

      process.nextTick(() => {
        fakeProcess.stdout.emit('data', Buffer.from('{}'));
        fakeProcess.emit('close', 0);
      });

      await promise;

      expect(childProcess.spawn).toHaveBeenCalledWith(
        'python',
        expect.arrayContaining([
          expect.any(String),
          degreesURL['Building Engineering'],
        ])
      );
    });
  });

  describe('concurrent calls', () => {
    it('should handle multiple concurrent scraper calls independently', async () => {
      // Create two separate fake processes
      const fakeProcess1 = new EventEmitter();
      fakeProcess1.stdout = new EventEmitter();
      fakeProcess1.stderr = new EventEmitter();

      const fakeProcess2 = new EventEmitter();
      fakeProcess2.stdout = new EventEmitter();
      fakeProcess2.stderr = new EventEmitter();

      const fakeData1 = { degree: { _id: 'deg1' }, courses: [] };
      const fakeData2 = { degree: { _id: 'deg2' }, courses: [] };

      childProcess.spawn
        .mockReturnValueOnce(fakeProcess1)
        .mockReturnValueOnce(fakeProcess2);

      const promise1 = runScraper('Computer Engineering');
      const promise2 = runScraper('Mechanical Engineering');

      process.nextTick(() => {
        fakeProcess1.stdout.emit('data', Buffer.from(JSON.stringify(fakeData1)));
        fakeProcess1.emit('close', 0);

        fakeProcess2.stdout.emit('data', Buffer.from(JSON.stringify(fakeData2)));
        fakeProcess2.emit('close', 0);
      });

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toEqual(fakeData1);
      expect(result2).toEqual(fakeData2);
      expect(childProcess.spawn).toHaveBeenCalledTimes(2);
    });
  });
});
