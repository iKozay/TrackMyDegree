import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { applyPatchFile } from './applyCatalogAcademicYearPatch';
import { generatePatchFromSnapshotData } from './generateCatalogPatchFromSnapshot';
import {
  CatalogSnapshotPayload,
  scrapeCatalogSnapshot,
} from './scrapeCatalogSnapshot';

dotenv.config();

interface CatalogCommandArgs {
  academicYear?: string;
  degree?: string;
  apply: boolean;
  writeSnapshot: boolean;
  writePatch: boolean;
  inspectDir?: string;
}

export function parseArgs(argv: string[]): CatalogCommandArgs {
  const valueArgs = new Map<string, string>();
  const flagArgs = new Set<string>();

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith('--')) continue;

    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      flagArgs.add(value);
      continue;
    }

    valueArgs.set(value, next);
    index += 1;
  }

  return {
    academicYear: valueArgs.get('--academic-year'),
    degree: valueArgs.get('--degree'),
    apply: flagArgs.has('--apply'),
    writeSnapshot: flagArgs.has('--write-snapshot'),
    writePatch: flagArgs.has('--write-patch'),
    inspectDir: valueArgs.get('--inspect-dir'),
  };
}

export function getMongoUri(): string {
  return (
    process.env.MONGODB_URI ||
    'mongodb://admin:changeme123@localhost:27017/trackmydegree?authSource=admin'
  );
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

export function printUsage(): void {
  console.log(
    [
      'Usage:',
      '  npm run catalog -- --academic-year 2026-2027 [--degree "BCompSc in Computer Science"] [--apply] [--write-snapshot] [--write-patch] [--inspect-dir ./tmp/catalog]',
      '',
      'Behavior:',
      '  Scrapes the catalog, generates JSON Patch diffs, validates them, and by default runs as dry-run.',
      '  Add --apply to write base entities and diffs to MongoDB.',
      '  Add --write-snapshot and/or --write-patch to save intermediate files for inspection.',
    ].join('\n'),
  );
}

export async function maybeWriteSnapshot(
  snapshot: CatalogSnapshotPayload,
  args: CatalogCommandArgs,
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
  args: CatalogCommandArgs,
): Promise<string | undefined> {
  if (!args.writePatch) {
    return undefined;
  }

  const inspectDir = resolveInspectDir(academicYear, args.inspectDir);
  return writeInspectionFile(path.join(inspectDir, 'patch.json'), patch);
}

export async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (!args.academicYear) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  await mongoose.connect(getMongoUri());

  try {
    const snapshot = await scrapeCatalogSnapshot({
      academicYear: args.academicYear,
      degree: args.degree,
    });
    const snapshotPath = await maybeWriteSnapshot(snapshot, args);

    const patch = await generatePatchFromSnapshotData(
      snapshot as Parameters<typeof generatePatchFromSnapshotData>[0],
    );
    const patchPath = await maybeWritePatch(patch, snapshot.academicYear, args);

    const summary = await applyPatchFile(patch, args.apply);

    console.log(
      JSON.stringify(
        {
          mode: args.apply ? 'apply' : 'dry-run',
          academicYear: snapshot.academicYear,
          inspectionFiles: {
            snapshot: snapshotPath,
            patch: patchPath,
          },
          summary,
        },
        null,
        2,
      ),
    );
  } finally {
    await mongoose.disconnect();
  }
}

/* istanbul ignore next */
if (require.main === module) {
  (async () => {
    try {
      await main();
    } catch (error) {
      console.error(
        JSON.stringify(
          {
            error: error instanceof Error ? error.message : String(error),
          },
          null,
          2,
        ),
      );
      process.exit(1);
    }
  })();
}
