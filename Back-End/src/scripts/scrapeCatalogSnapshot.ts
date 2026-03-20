import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import axios from 'axios';
import { getAllCourses, parseAllDegrees, parseDegree } from '@utils/pythonUtilsApi';
import { PYTHON_SERVICE_BASE_URL } from '@utils/constants';

dotenv.config();

interface ScrapeArgs {
  academicYear?: string;
  degree?: string;
  out?: string;
}

function parseArgs(argv: string[]): ScrapeArgs {
  const args = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith('--')) continue;

    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      continue;
    }

    args.set(value, next);
    index += 1;
  }

  return {
    academicYear: args.get('--academic-year'),
    degree: args.get('--degree'),
    out: args.get('--out'),
  };
}

function resolveOutputPath(academicYear: string, out?: string): string {
  if (out) return path.resolve(out);

  const safeYear = academicYear.replace(/[^0-9-]/g, '_');
  return path.resolve(
    process.cwd(),
    'tmp',
    `catalog-snapshot-${safeYear}.json`,
  );
}

async function ensurePythonServiceReady(): Promise<void> {
  try {
    await axios.get(`${PYTHON_SERVICE_BASE_URL}/health`, { timeout: 5000 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    throw new Error(
      `Python scraper service is not reachable at ${PYTHON_SERVICE_BASE_URL}. ${message}`,
    );
  }
}

function printUsage(): void {
  console.log(
    [
      'Usage:',
      '  npm run catalog:scrape -- --academic-year 2026-2027 [--degree "BCompSc in Computer Science"] [--out ./tmp/catalog.json]',
      '',
      'Behavior:',
      '  Runs the actual Python scraper service and writes scraped JSON to disk.',
      '  If --degree is omitted, all supported degrees are scraped.',
    ].join('\n'),
  );
}

export async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (!args.academicYear) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  await ensurePythonServiceReady();

  const [degrees, courses] = await Promise.all([
    args.degree ? Promise.resolve([await parseDegree(args.degree)]) : parseAllDegrees(),
    getAllCourses(),
  ]);

  const outputPath = resolveOutputPath(args.academicYear, args.out);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const payload = {
    academicYear: args.academicYear,
    scrapedAt: new Date().toISOString(),
    source: {
      pythonServiceBaseUrl: PYTHON_SERVICE_BASE_URL,
      mode: args.degree ? 'single-degree' : 'all-degrees',
    },
    degrees,
    courses,
  };

  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  console.log(
    JSON.stringify(
      {
        outputPath,
        academicYear: args.academicYear,
        degreeCount: degrees.length,
        courseCount: courses.length,
      },
      null,
      2,
    ),
  );
}

if (require.main === module) {
  void main().catch((error) => {
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
  });
}
