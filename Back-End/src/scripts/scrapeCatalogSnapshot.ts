import dotenv from 'dotenv';
import axios from 'axios';
import {
  getAllCourses,
  parseAllDegrees,
  parseDegree,
} from '@utils/pythonUtilsApi';
import { PYTHON_SERVICE_BASE_URL } from '@utils/constants';

dotenv.config();

export interface CatalogSnapshotPayload {
  academicYear: string;
  scrapedAt: string;
  source: {
    pythonServiceBaseUrl: string;
    mode: 'single-degree' | 'all-degrees';
  };
  degrees: unknown[];
  courses: unknown[];
}

export async function ensurePythonServiceReady(): Promise<void> {
  try {
    await axios.get(`${PYTHON_SERVICE_BASE_URL}/health`, { timeout: 50000 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Python scraper service is not reachable at ${PYTHON_SERVICE_BASE_URL}. ${message}`,
    );
  }
}

export async function scrapeCatalogSnapshot(options: {
  academicYear: string;
  degree?: string;
}): Promise<CatalogSnapshotPayload> {
  await ensurePythonServiceReady();

  const [degrees, courses] = await Promise.all([
    options.degree
      ? Promise.resolve([await parseDegree(options.degree)])
      : parseAllDegrees(),
    getAllCourses(),
  ]);

  return {
    academicYear: options.academicYear,
    scrapedAt: new Date().toISOString(),
    source: {
      pythonServiceBaseUrl: PYTHON_SERVICE_BASE_URL,
      mode: options.degree ? 'single-degree' : 'all-degrees',
    },
    degrees,
    courses,
  };
}
