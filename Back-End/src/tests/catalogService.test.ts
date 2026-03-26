import fs from 'node:fs/promises';
import {
  CatalogError,
  CatalogResult,
  maybeWritePatch,
  maybeWriteSnapshot,
  resolveInspectDir,
  runCatalog,
  writeInspectionFile,
} from '../services/catalogService';
import { applyPatchFile } from '../scripts/applyCatalogAcademicYearPatch';
import { generatePatchFromSnapshotData } from '../scripts/generateCatalogPatchFromSnapshot';
import { scrapeCatalogSnapshot } from '../scripts/scrapeCatalogSnapshot';

jest.mock('node:fs/promises');
jest.mock('../scripts/applyCatalogAcademicYearPatch');
jest.mock('../scripts/generateCatalogPatchFromSnapshot');
jest.mock('../scripts/scrapeCatalogSnapshot');

const mockFs = fs as jest.Mocked<typeof fs>;
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

describe('catalogService', () => {
  const academicYear = '2026-2027';
  const pythonServiceBaseUrl = 'http://localhost:15001';
  const allDegreesMode = 'all-degrees' as const;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.mkdir.mockResolvedValue(undefined as never);
    mockFs.writeFile.mockResolvedValue(undefined);
  });

  it('resolves inspect dir', () => {
    expect(resolveInspectDir(academicYear, './tmp/foo')).toContain('tmp/foo');
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
      academicYear,
      scrapedAt: 'now',
      source: {
        pythonServiceBaseUrl,
        mode: allDegreesMode,
      },
      degrees: [],
      courses: [],
    };

    await expect(
      maybeWriteSnapshot(snapshot, {
        academicYear,
        apply: false,
        writeSnapshot: false,
        writePatch: false,
      }),
    ).resolves.toBeUndefined();

    await expect(
      maybeWritePatch({ patch: true }, academicYear, {
        academicYear,
        apply: false,
        writeSnapshot: false,
        writePatch: false,
      }),
    ).resolves.toBeUndefined();

    await expect(
      maybeWriteSnapshot(snapshot, {
        academicYear,
        apply: false,
        writeSnapshot: true,
        writePatch: false,
      }),
      // eslint-disable-next-line sonarjs/no-duplicate-string
    ).resolves.toContain('snapshot.json');

    await expect(
      maybeWritePatch({ patch: true }, academicYear, {
        academicYear,
        apply: false,
        writeSnapshot: false,
        writePatch: true,
      }),
      // eslint-disable-next-line sonarjs/no-duplicate-string
    ).resolves.toContain('patch.json');
  });

  it('runs end-to-end orchestration', async () => {
    mockScrapeCatalogSnapshot.mockResolvedValue({
      academicYear,
      scrapedAt: 'now',
      source: {
        pythonServiceBaseUrl,
        mode: allDegreesMode,
      },
      degrees: [],
      courses: [],
    });
    mockGeneratePatchFromSnapshotData.mockResolvedValue({
      academicYear,
      baseEntities: { degrees: [], coursePools: [], courses: [] },
      diffs: { degrees: [], coursePools: [], courses: [] },
    } as never);
    mockApplyPatchFile.mockResolvedValue({
      upsertedDegrees: 0,
      upsertedCoursePools: 0,
      upsertedCourses: 0,
      upsertedDiffs: 0,
    });

    await expect(
      runCatalog({
        academicYear,
        apply: true,
        writeSnapshot: true,
        writePatch: true,
      }),
    ).resolves.toEqual<CatalogResult>({
      mode: 'apply',
      academicYear,
      inspectionFiles: {
        snapshot: expect.stringContaining('snapshot.json'),
        patch: expect.stringContaining('patch.json'),
      },
      summary: {
        upsertedDegrees: 0,
        upsertedCoursePools: 0,
        upsertedCourses: 0,
        upsertedDiffs: 0,
      },
    } as unknown as CatalogResult);

    expect(mockScrapeCatalogSnapshot).toHaveBeenCalledWith({
      academicYear,
      degree: undefined,
    });
    expect(mockGeneratePatchFromSnapshotData).toHaveBeenCalled();
    expect(mockApplyPatchFile).toHaveBeenCalledWith(expect.any(Object), true);
  });

  it('runs in dry-run mode when apply is omitted', async () => {
    mockScrapeCatalogSnapshot.mockResolvedValue({
      academicYear,
      scrapedAt: 'now',
      source: {
        pythonServiceBaseUrl,
        mode: allDegreesMode,
      },
      degrees: [],
      courses: [],
    });
    mockGeneratePatchFromSnapshotData.mockResolvedValue({
      academicYear,
      baseEntities: { degrees: [], coursePools: [], courses: [] },
      diffs: { degrees: [], coursePools: [], courses: [] },
    } as never);
    mockApplyPatchFile.mockResolvedValue({
      upsertedDegrees: 0,
      upsertedCoursePools: 0,
      upsertedCourses: 0,
      upsertedDiffs: 0,
    });

    await expect(
      runCatalog({
        academicYear,
        apply: false,
        writeSnapshot: false,
        writePatch: false,
      }),
    ).resolves.toMatchObject({
      mode: 'dry-run',
      academicYear,
    });
  });

  it('preserves written snapshot path when a later step fails', async () => {
    mockScrapeCatalogSnapshot.mockResolvedValue({
      academicYear,
      scrapedAt: 'now',
      source: {
        pythonServiceBaseUrl,
        mode: allDegreesMode,
      },
      degrees: [],
      courses: [],
    });
    mockGeneratePatchFromSnapshotData.mockRejectedValue(
      new Error('patch generation failed'),
    );

    let error: unknown;
    try {
      await runCatalog({
        academicYear,
        apply: false,
        writeSnapshot: true,
        writePatch: false,
      });
    } catch (caughtError) {
      error = caughtError;
    }

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).name).toBe('CatalogError');
    expect((error as Error).message).toBe('patch generation failed');
    expect(
      (error as { inspectionFiles?: { snapshot?: string } }).inspectionFiles
        ?.snapshot,
    ).toEqual(expect.stringContaining('snapshot.json'));
    expect(
      (error as { inspectionFiles?: { patch?: string } }).inspectionFiles
        ?.patch,
    ).toBeUndefined();

    expect(mockFs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('snapshot.json'),
      expect.any(String),
      'utf8',
    );
  });

  it('preserves written patch path when apply fails', async () => {
    mockScrapeCatalogSnapshot.mockResolvedValue({
      academicYear,
      scrapedAt: 'now',
      source: {
        pythonServiceBaseUrl,
        mode: allDegreesMode,
      },
      degrees: [],
      courses: [],
    });
    mockGeneratePatchFromSnapshotData.mockResolvedValue({
      academicYear,
      baseEntities: { degrees: [], coursePools: [], courses: [] },
      diffs: { degrees: [], coursePools: [], courses: [] },
    } as never);
    mockApplyPatchFile.mockRejectedValue(new Error('apply failed'));

    let error: unknown;
    try {
      await runCatalog({
        academicYear,
        apply: false,
        writeSnapshot: true,
        writePatch: true,
      });
    } catch (caughtError) {
      error = caughtError;
    }

    expect(error).toBeInstanceOf(CatalogError);
    expect((error as Error).message).toBe('apply failed');
    expect(
      (error as { inspectionFiles?: { snapshot?: string } }).inspectionFiles
        ?.snapshot,
    ).toEqual(expect.stringContaining('snapshot.json'));
    expect(
      (error as { inspectionFiles?: { patch?: string } }).inspectionFiles
        ?.patch,
    ).toEqual(expect.stringContaining('patch.json'));

    expect(mockFs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('patch.json'),
      expect.any(String),
      'utf8',
    );
  });
});
