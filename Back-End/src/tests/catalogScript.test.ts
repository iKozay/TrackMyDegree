import fs from 'node:fs/promises';
import mongoose from 'mongoose';
import {
  getMongoUri,
  main,
  maybeWritePatch,
  maybeWriteSnapshot,
  parseArgs,
  resolveInspectDir,
  writeInspectionFile,
} from '../scripts/catalog';
import { applyPatchFile } from '../scripts/applyCatalogAcademicYearPatch';
import { generatePatchFromSnapshotData } from '../scripts/generateCatalogPatchFromSnapshot';
import { scrapeCatalogSnapshot } from '../scripts/scrapeCatalogSnapshot';

jest.mock('node:fs/promises');
jest.mock('mongoose');
jest.mock('../scripts/applyCatalogAcademicYearPatch');
jest.mock('../scripts/generateCatalogPatchFromSnapshot');
jest.mock('../scripts/scrapeCatalogSnapshot');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockMongoose = mongoose as jest.Mocked<typeof mongoose>;
const mockApplyPatchFile = applyPatchFile as jest.MockedFunction<
  typeof applyPatchFile
>;
const mockGeneratePatchFromSnapshotData =
  generatePatchFromSnapshotData as jest.MockedFunction<
    typeof generatePatchFromSnapshotData
  >;
const mockScrapeCatalogSnapshot = scrapeCatalogSnapshot as jest.MockedFunction<
  typeof scrapeCatalogSnapshot
>;

describe('catalog script', () => {
  const originalArgv = process.argv;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.argv = [...originalArgv];
    process.env = { ...originalEnv };
    mockFs.mkdir.mockResolvedValue(undefined as never);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockMongoose.connect.mockResolvedValue(mockMongoose as never);
    mockMongoose.disconnect.mockResolvedValue(undefined);
  });

  afterAll(() => {
    process.argv = originalArgv;
    process.env = originalEnv;
  });

  it('parses command arguments', () => {
    expect(
      parseArgs([
        '--academic-year',
        '2026-2027',
        '--degree',
        'COMP',
        '--apply',
        '--write-snapshot',
        '--write-patch',
        '--inspect-dir',
        './tmp/out',
      ]),
    ).toEqual({
      academicYear: '2026-2027',
      degree: 'COMP',
      apply: true,
      writeSnapshot: true,
      writePatch: true,
      inspectDir: './tmp/out',
    });

    expect(parseArgs(['noop', '--apply', '--academic-year'])).toEqual({
      academicYear: undefined,
      degree: undefined,
      apply: true,
      writeSnapshot: false,
      writePatch: false,
      inspectDir: undefined,
    });
  });

  it('returns configured or default mongo uri', () => {
    delete (process.env as any).MONGODB_URI;
    expect(getMongoUri()).toContain('localhost:27017');

    process.env.MONGODB_URI = 'mongodb://custom';
    expect(getMongoUri()).toBe('mongodb://custom');
  });

  it('resolves inspect dir', () => {
    expect(resolveInspectDir('2026-2027', './tmp/foo')).toContain('tmp/foo');
    expect(resolveInspectDir('2026/2027')).toContain('catalog-2026_2027');
  });

  it('writes inspection files', async () => {
    const output = await writeInspectionFile('/tmp/catalog/file.json', {
      ok: true,
    });

    expect(output).toBe('/tmp/catalog/file.json');
    expect(mockFs.mkdir).toHaveBeenCalled();
    expect(mockFs.writeFile).toHaveBeenCalled();
  });

  it('conditionally writes snapshot and patch files', async () => {
    const snapshot = {
      academicYear: '2026-2027',
      scrapedAt: 'now',
      source: {
        pythonServiceBaseUrl: 'http://localhost:15001',
        mode: 'all-degrees' as const,
      },
      degrees: [],
      courses: [],
    };

    await expect(
      maybeWriteSnapshot(snapshot, {
        academicYear: '2026-2027',
        apply: false,
        writeSnapshot: false,
        writePatch: false,
      }),
    ).resolves.toBeUndefined();

    await expect(
      maybeWritePatch(
        { patch: true },
        '2026-2027',
        {
          academicYear: '2026-2027',
          apply: false,
          writeSnapshot: false,
          writePatch: false,
        },
      ),
    ).resolves.toBeUndefined();

    await expect(
      maybeWriteSnapshot(snapshot, {
        academicYear: '2026-2027',
        apply: false,
        writeSnapshot: true,
        writePatch: false,
      }),
    ).resolves.toContain('snapshot.json');

    await expect(
      maybeWritePatch(
        { patch: true },
        '2026-2027',
        {
          academicYear: '2026-2027',
          apply: false,
          writeSnapshot: false,
          writePatch: true,
        },
      ),
    ).resolves.toContain('patch.json');
  });

  it('prints usage and exits early when academic year is missing', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    process.argv = ['node', 'catalog.ts'];
    process.exitCode = 0;

    await main();

    expect(process.exitCode).toBe(1);
    expect(mockMongoose.connect).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalled();

    logSpy.mockRestore();
  });

  it('runs end-to-end orchestration', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    mockScrapeCatalogSnapshot.mockResolvedValue({
      academicYear: '2026-2027',
      scrapedAt: 'now',
      source: {
        pythonServiceBaseUrl: 'http://localhost:15001',
        mode: 'all-degrees',
      },
      degrees: [],
      courses: [],
    });
    mockGeneratePatchFromSnapshotData.mockResolvedValue({
      academicYear: '2026-2027',
      baseEntities: { degrees: [], coursePools: [], courses: [] },
      diffs: { degrees: [], coursePools: [], courses: [] },
    } as never);
    mockApplyPatchFile.mockResolvedValue({
      upsertedDegrees: 0,
      upsertedCoursePools: 0,
      upsertedCourses: 0,
      upsertedDiffs: 0,
    });

    process.argv = [
      'node',
      'catalog.ts',
      '--academic-year',
      '2026-2027',
      '--apply',
      '--write-snapshot',
      '--write-patch',
    ];

    await main();

    expect(mockMongoose.connect).toHaveBeenCalled();
    expect(mockScrapeCatalogSnapshot).toHaveBeenCalledWith({
      academicYear: '2026-2027',
      degree: undefined,
    });
    expect(mockGeneratePatchFromSnapshotData).toHaveBeenCalled();
    expect(mockApplyPatchFile).toHaveBeenCalledWith(expect.any(Object), true);
    expect(mockMongoose.disconnect).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalled();

    logSpy.mockRestore();
  });

  it('runs in dry-run mode when apply is omitted', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    mockScrapeCatalogSnapshot.mockResolvedValue({
      academicYear: '2026-2027',
      scrapedAt: 'now',
      source: {
        pythonServiceBaseUrl: 'http://localhost:15001',
        mode: 'all-degrees',
      },
      degrees: [],
      courses: [],
    });
    mockGeneratePatchFromSnapshotData.mockResolvedValue({
      academicYear: '2026-2027',
      baseEntities: { degrees: [], coursePools: [], courses: [] },
      diffs: { degrees: [], coursePools: [], courses: [] },
    } as never);
    mockApplyPatchFile.mockResolvedValue({
      upsertedDegrees: 0,
      upsertedCoursePools: 0,
      upsertedCourses: 0,
      upsertedDiffs: 0,
    });

    process.argv = ['node', 'catalog.ts', '--academic-year', '2026-2027'];

    await main();

    expect(mockApplyPatchFile).toHaveBeenCalledWith(expect.any(Object), false);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('"mode": "dry-run"'),
    );

    logSpy.mockRestore();
  });
});
