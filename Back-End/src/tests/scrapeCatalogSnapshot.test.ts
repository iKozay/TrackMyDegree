import fs from 'node:fs/promises';
import axios from 'axios';
import {
  main,
  parseArgs,
  resolveOutputPath,
  scrapeCatalogSnapshot,
  ensurePythonServiceReady,
} from '../scripts/scrapeCatalogSnapshot';
import {
  getAllCourses,
  parseAllDegrees,
  parseDegree,
} from '@utils/pythonUtilsApi';

jest.mock('node:fs/promises');
jest.mock('axios');
jest.mock('@utils/pythonUtilsApi');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockAxios = axios as jest.Mocked<typeof axios>;
const mockGetAllCourses = getAllCourses as jest.MockedFunction<
  typeof getAllCourses
>;
const mockParseAllDegrees = parseAllDegrees as jest.MockedFunction<
  typeof parseAllDegrees
>;
const mockParseDegree = parseDegree as jest.MockedFunction<typeof parseDegree>;
describe('scrapeCatalogSnapshot script', () => {
  const originalArgv = process.argv;
  const academicYear = '2026-2027';
  const degreeId = 'COMP';
  const academicYearArg = '--academic-year';

  beforeEach(() => {
    jest.clearAllMocks();
    process.argv = [...originalArgv];
    mockFs.mkdir.mockResolvedValue(undefined as never);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockAxios.get.mockResolvedValue({ data: { status: 'ok' } } as never);
    mockGetAllCourses.mockResolvedValue([{ _id: 'COMP 248' }] as never);
    mockParseAllDegrees.mockResolvedValue([{ degree: { _id: 'COMP' } }] as never);
    mockParseDegree.mockResolvedValue({ degree: { _id: 'COMP' } } as never);
  });

  afterAll(() => {
    process.argv = originalArgv;
  });

  it('parses args and output path', () => {
    expect(
      parseArgs([
        academicYearArg,
        academicYear,
        '--degree',
        degreeId,
        '--out',
        './tmp/file.json',
      ]),
    ).toEqual({
      academicYear,
      degree: degreeId,
      out: './tmp/file.json',
    });

    expect(parseArgs([academicYearArg])).toEqual({
      academicYear: undefined,
      degree: undefined,
      out: undefined,
    });
    expect(parseArgs(['noop', academicYearArg, academicYear])).toEqual({
      academicYear,
      degree: undefined,
      out: undefined,
    });

    expect(resolveOutputPath('2026/2027')).toContain('catalog-snapshot-2026_2027');
    expect(resolveOutputPath('2026-2027', './tmp/explicit.json')).toContain(
      'explicit.json',
    );
  });

  it('checks scraper health and throws when unavailable', async () => {
    await expect(ensurePythonServiceReady()).resolves.toBeUndefined();

    mockAxios.get.mockRejectedValueOnce(new Error('timeout'));
    await expect(ensurePythonServiceReady()).rejects.toThrow(
      'Python scraper service is not reachable',
    );

    mockAxios.get.mockRejectedValueOnce('timeout');
    await expect(ensurePythonServiceReady()).rejects.toThrow('timeout');
  });

  it('scrapes all degrees or one degree', async () => {
    const allPayload = await scrapeCatalogSnapshot({ academicYear });
    expect(mockParseAllDegrees).toHaveBeenCalled();
    expect(allPayload.source.mode).toBe('all-degrees');

    const onePayload = await scrapeCatalogSnapshot({
      academicYear,
      degree: degreeId,
    });
    expect(mockParseDegree).toHaveBeenCalledWith(degreeId);
    expect(onePayload.source.mode).toBe('single-degree');
  });

  it('prints usage when academic year is missing', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    process.argv = ['node', 'scrapeCatalogSnapshot.ts'];
    process.exitCode = 0;

    await main();

    expect(process.exitCode).toBe(1);
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('writes scraped payload on success', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    process.argv = [
      'node',
      'scrapeCatalogSnapshot.ts',
      academicYearArg,
      academicYear,
    ];

    await main();

    expect(mockFs.mkdir).toHaveBeenCalled();
    expect(mockFs.writeFile).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalled();

    logSpy.mockRestore();
  });
});
