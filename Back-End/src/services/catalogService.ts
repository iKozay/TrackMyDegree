import fs from 'node:fs/promises';
import path from 'node:path';
import { applyPatchFile } from '../scripts/applyCatalogAcademicYearPatch';
import { generatePatchFromSnapshotData } from '../scripts/generateCatalogPatchFromSnapshot';
import {
  CatalogSnapshotPayload,
  scrapeCatalogSnapshot,
} from '../scripts/scrapeCatalogSnapshot';

export interface CatalogArgs {
  academicYear: string;
  degree?: string;
  apply: boolean;
  writeSnapshot: boolean;
  writePatch: boolean;
  inspectDir?: string;
}

export type InspectionFiles = {
  snapshot?: string;
  patch?: string;
};

export type CatalogResult = {
  mode: 'apply' | 'dry-run';
  academicYear: string;
  inspectionFiles: InspectionFiles;
  summary: Awaited<ReturnType<typeof applyPatchFile>>;
};

export class CatalogError extends Error {
  inspectionFiles: InspectionFiles;

  constructor(message: string, inspectionFiles: InspectionFiles) {
    super(message);
    this.name = 'CatalogError';
    this.inspectionFiles = inspectionFiles;
  }
}

export function resolveInspectDir(
  academicYear: string,
  inspectDir?: string,
): string {
  if (inspectDir) {
    return path.resolve(inspectDir);
  }

  const safeYear = academicYear.replaceAll(/[^0-9-]/g, '_');
  return path.resolve(process.cwd(), 'tmp', `catalog-${safeYear}`);
}

export async function writeInspectionFile(
  filePath: string,
  payload: unknown,
): Promise<string> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return filePath;
}

export async function maybeWriteSnapshot(
  snapshot: CatalogSnapshotPayload,
  args: CatalogArgs,
): Promise<string | undefined> {
  if (!args.writeSnapshot) {
    return undefined;
  }

  const inspectDir = resolveInspectDir(snapshot.academicYear, args.inspectDir);
  return writeInspectionFile(path.join(inspectDir, 'snapshot.json'), snapshot);
}

export async function maybeWritePatch(
  patch: unknown,
  academicYear: string,
  args: CatalogArgs,
): Promise<string | undefined> {
  if (!args.writePatch) {
    return undefined;
  }

  const inspectDir = resolveInspectDir(academicYear, args.inspectDir);
  return writeInspectionFile(path.join(inspectDir, 'patch.json'), patch);
}

export async function runCatalog(args: CatalogArgs): Promise<CatalogResult> {
  const inspectionFiles: InspectionFiles = {};

  try {
    const snapshot = await scrapeCatalogSnapshot({
      academicYear: args.academicYear,
      degree: args.degree,
    });
    inspectionFiles.snapshot = await maybeWriteSnapshot(snapshot, args);

    const patch = await generatePatchFromSnapshotData(
      snapshot as Parameters<typeof generatePatchFromSnapshotData>[0],
    );
    inspectionFiles.patch = await maybeWritePatch(
      patch,
      snapshot.academicYear,
      args,
    );

    const summary = await applyPatchFile(patch, args.apply);

    return {
      mode: args.apply ? 'apply' : 'dry-run',
      academicYear: snapshot.academicYear,
      inspectionFiles,
      summary,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CatalogError(message, inspectionFiles);
  }
}
