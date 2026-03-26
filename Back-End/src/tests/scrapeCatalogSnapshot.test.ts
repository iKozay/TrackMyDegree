import axios from 'axios';
import {
  scrapeCatalogSnapshot,
  ensurePythonServiceReady,
} from '../scripts/scrapeCatalogSnapshot';
import {
  getAllCourses,
  parseAllDegrees,
  parseDegree,
} from '@utils/pythonUtilsApi';

jest.mock('axios');
jest.mock('@utils/pythonUtilsApi');

const mockAxios = axios as jest.Mocked<typeof axios>;
const mockGetAllCourses = getAllCourses as jest.MockedFunction<
  typeof getAllCourses
>;
const mockParseAllDegrees = parseAllDegrees as jest.MockedFunction<
  typeof parseAllDegrees
>;
const mockParseDegree = parseDegree as jest.MockedFunction<typeof parseDegree>;
describe('scrapeCatalogSnapshot script', () => {
  const academicYear = '2026-2027';
  const degreeId = 'COMP';

  beforeEach(() => {
    jest.clearAllMocks();
    mockAxios.get.mockResolvedValue({ data: { status: 'ok' } } as never);
    mockGetAllCourses.mockResolvedValue([{ _id: 'COMP 248' }] as never);
    mockParseAllDegrees.mockResolvedValue([{ degree: { _id: 'COMP' } }] as never);
    mockParseDegree.mockResolvedValue({ degree: { _id: 'COMP' } } as never);
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

});
