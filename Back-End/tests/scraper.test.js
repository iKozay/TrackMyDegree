const EventEmitter = require('events');

class MockProcess extends EventEmitter {
  constructor() {
    super();
    this.stdout = new EventEmitter();
    this.stderr = new EventEmitter();
  }

  cleanup() {
    this.removeAllListeners();
    this.stdout.removeAllListeners();
    this.stderr.removeAllListeners();
  }
}

const mockSpawn = jest.fn(() => {
  const process = new MockProcess();
  mockSpawn.lastInstance = process;
  return process;
});

jest.mock('node:child_process', () => ({
  spawn: mockSpawn,
}));

const {
  runScraper,
} = require('../course-data/Scraping/Scrapers/runScraper.js');

describe('runScraper', () => {
  beforeEach(() => {
    mockSpawn.lastInstance = null;
  });

  afterEach(() => {
    if (mockSpawn.lastInstance) {
      mockSpawn.lastInstance.cleanup();
    }
    jest.clearAllMocks();
  });

  test('resolves successfully when Python exits with code 0', async () => {
    const promise = runScraper('fake_script.py', ['arg1']);
    const proc = mockSpawn.lastInstance;

    expect(proc).toBeDefined();
    proc.stdout.emit('data', 'Output 1');
    proc.stdout.emit('data', 'Output 2');
    proc.emit('close', 0);

    await expect(promise).resolves.toBe('Output 1Output 2');
  });

  test('rejects when Python exits with non-zero code', async () => {
    const promise = runScraper('fake_script.py');
    const proc = mockSpawn.lastInstance;

    expect(proc).toBeDefined();
    proc.stderr.emit('data', 'Something went wrong');
    proc.emit('close', 1);

    await expect(promise).rejects.toThrow(
      'Python error (code 1): Something went wrong',
    );
  });

  test('handles empty stdout/stderr gracefully', async () => {
    const promise = runScraper('empty_script.py');
    const proc = mockSpawn.lastInstance;

    expect(proc).toBeDefined();
    proc.emit('close', 0);

    await expect(promise).resolves.toBe('');
  });

  test('handles stderr with no content but non-zero exit', async () => {
    const promise = runScraper('error_script.py');
    const proc = mockSpawn.lastInstance;

    expect(proc).toBeDefined();
    proc.emit('close', 1);

    await expect(promise).rejects.toThrow('Python error (code 1): ');
  });

  test('spawn called with correct arguments', () => {
    runScraper('../Scraping/Scrapers/course_data_scraper.py', ['arg1', 'arg2']);
    
    expect(mockSpawn).toHaveBeenCalledWith(
      '/usr/bin/python3',
      ['../Scraping/Scrapers/course_data_scraper.py', 'arg1', 'arg2'],
      {
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
  });

  test('trims output when resolving', async () => {
    const promise = runScraper('script.py');
    const proc = mockSpawn.lastInstance;

    expect(proc).toBeDefined();
    proc.stdout.emit('data', '  Output with spaces  \n');
    proc.emit('close', 0);

    await expect(promise).resolves.toBe('Output with spaces');
  });
});
