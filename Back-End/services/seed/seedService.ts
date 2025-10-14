import fs from 'fs';
import path from 'path';
import { readdir } from 'fs/promises';
import { Course } from '../../models/Course';
import { Degree } from '../../models/Degree';
import * as Sentry from '@sentry/node';

// -------------------------------------
// Data Interfaces
// -------------------------------------
interface Requirement {
  poolId: string;
  poolName: string;
  creditsRequired: number;
  courseCodes: string[];
}

interface DegreeData {
  degreeId: string;
  degreeName: string;
  totalCredits: number;
  requirements: Requirement[];
  isAddon: boolean;
}

interface CourseJson {
  title: string;
  credits?: number;
  description?: string;
  prerequisites?: string;
  corequisites?: string;
  offeredIn?: string[];
}

// -------------------------------------
// Parse Requirements File
// -------------------------------------
function parseRequirementsFile(filePath: string): DegreeData {
  const text = fs.readFileSync(filePath, 'utf-8');
  const lines = text.split('\n').map((l) => l.trim());

  let degreeId = '';
  let degreeName = '';
  let totalCredits = 120;
  let isAddon = false;
  const requirements: Requirement[] = [];
  let currentPoolName = '';
  let currentCredits = 0;
  let currentCourseCodes: string[] = [];

  function pushCurrentPool() {
    if (currentPoolName) {
      const uniquePoolName = `${degreeId} - ${currentPoolName}`;
      requirements.push({
        poolId: uniquePoolName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/-credits/g, ''),
        poolName: uniquePoolName,
        creditsRequired: currentCredits,
        courseCodes: currentCourseCodes.filter((cc) => cc),
      });
    }
  }

  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    if (line.includes('DegreeID=')) {
      degreeId = line.split('=')[1].trim();
      continue;
    }
    if (line.includes('DegreeName=')) {
      degreeName = line.split('=')[1].trim();
      continue;
    }
    if (line.includes('TotalCredits=')) {
      totalCredits = parseFloat(line.split('=')[1].trim());
      continue;
    }
    if (line.includes('Addon')) {
      isAddon = true;
      continue;
    }
    const bracketMatch = line.match(/^\[(.*)\]$/);
    if (bracketMatch) {
      pushCurrentPool();
      currentPoolName = bracketMatch[1];
      currentCourseCodes = [];
      const creditsMatch = currentPoolName.match(/\(([\d\.]+)\s*credits?\)/i);
      currentCredits = creditsMatch ? parseFloat(creditsMatch[1]) : 0;
      continue;
    }
    currentCourseCodes.push(line);
  }
  pushCurrentPool();
  return { degreeId, degreeName, totalCredits, requirements, isAddon };
}

// -------------------------------------
// Load Course JSONs
// -------------------------------------
function loadAllCourseJsons(dirPath: string): Map<string, CourseJson> {
  const courseMap = new Map<string, CourseJson>();

  function recurseDirectory(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        recurseDirectory(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
        try {
          const raw = fs.readFileSync(fullPath, 'utf-8');
          const data: CourseJson[] = JSON.parse(raw);
          for (const c of data) {
            const code = extractCodeFromTitle(c.title).toUpperCase();
            if (courseMap.has(code)) {
              console.warn(
                `Warning: Duplicate course code "${code}" found in file ${fullPath}. Overwriting.`,
              );
            }
            courseMap.set(code, c);
          }
        } catch (err) {
          Sentry.captureException({
            error: `Error parsing JSON file: ${fullPath}`,
          });
          console.error(`Error parsing JSON file: ${fullPath}`, err);
        }
      }
    }
  }

  recurseDirectory(dirPath);
  return courseMap;
}

function extractCodeFromTitle(title: string): string {
  const match = title.match(/^([A-Z]{2,4})\s*(\d{3})/);
  if (!match) throw new Error(`Invalid course title format: "${title}"`);
  return `${match[1]}${match[2]}`.toUpperCase();
}

// -------------------------------------
// Parse Requisites (Prerequisites/Corequisites)
// -------------------------------------
function parseRequisites(requisiteStr: string | undefined): string[] {
  if (!requisiteStr) return [];
  if (typeof requisiteStr !== 'string') {
    console.warn(
      `Expected string for requisites but got ${typeof requisiteStr}. Skipping.`,
    );
    return [];
  }

  const cleanedStr = requisiteStr.replace(/[;\.]/g, ',');
  const parts = cleanedStr
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  const requisites: string[] = [];

  for (const part of parts) {
    // Handle alternatives with '/'
    if (part.includes('/')) {
      const alternatives = part.split('/').map((c) => c.trim());
      for (const alt of alternatives) {
        const code = alt.replace(/\s+/g, '').toUpperCase();
        if (/^[A-Z]{2,4}\d{3}$/.test(code)) {
          requisites.push(code);
        } else if (!/^\d+CR$/i.test(code)) {
          console.warn(
            `Invalid course code "${code}" in requisites. Skipping.`,
          );
        }
      }
    } else {
      const code = part.replace(/\s+/g, '').toUpperCase();
      if (/^[A-Z]{2,4}\d{3}$/.test(code)) {
        requisites.push(code);
      } else if (!/^\d+CR$/i.test(code)) {
        console.warn(`Invalid course code "${code}" in requisites. Skipping.`);
      }
    }
  }

  return requisites;
}

// -------------------------------------
// Upsert Course
// -------------------------------------
async function upsertCourse(
  code: string,
  title: string,
  credits: number,
  description: string,
  offeredIn: string[],
  prerequisites: string[],
  corequisites: string[],
): Promise<void> {
  try {
    await Course.findByIdAndUpdate(
      code,
      {
        _id: code,
        title,
        credits,
        description,
        offeredIn,
        prerequisites,
        corequisites,
      },
      { upsert: true, new: true },
    );
    console.log(`Upserted Course: ${code}`);
  } catch (error) {
    console.error(`Error upserting course ${code}:`, error);
    throw error;
  }
}

// -------------------------------------
// Upsert Degree with Embedded Course Pools
// -------------------------------------
async function upsertDegree(
  degreeId: string,
  degreeName: string,
  totalCredits: number,
  isAddon: boolean,
  requirements: Requirement[],
): Promise<void> {
  try {
    const coursePools = requirements.map((req) => {
      const courses: string[] = [];

      for (const codeStr of req.courseCodes) {
        if (!codeStr) continue;

        // Handle alternatives (comma or slash separated)
        if (codeStr.includes(',') || codeStr.includes('/')) {
          const separator = codeStr.includes('/') ? '/' : ',';
          const alternatives = codeStr
            .split(separator)
            .map((c) => c.trim().toUpperCase().replace(/\s+/g, ''));
          courses.push(
            ...alternatives.filter((c) => /^[A-Z]{2,4}\d{3}$/.test(c)),
          );
        } else {
          const code = codeStr.toUpperCase().replace(/\s+/g, '');
          // Only add valid course codes (skip credit requirements like "60CR")
          if (/^[A-Z]{2,4}\d{3}$/.test(code)) {
            courses.push(code);
          }
        }
      }

      return {
        id: req.poolId,
        name: req.poolName,
        creditsRequired: req.creditsRequired,
        courses: [...new Set(courses)], // Remove duplicates
      };
    });

    await Degree.findByIdAndUpdate(
      degreeId,
      {
        _id: degreeId,
        name: degreeName,
        totalCredits,
        isAddon,
        coursePools,
      },
      { upsert: true, new: true },
    );
    console.log(`Upserted Degree: ${degreeName} (${degreeId})`);
  } catch (error) {
    console.error(`Error upserting degree ${degreeId}:`, error);
    throw error;
  }
}

// -------------------------------------
// Main Seed Function
// -------------------------------------
export async function seedDatabase(): Promise<void> {
  try {
    console.log('[SEED] Starting database seeding...');

    // 1. Define paths
    const requirementsDir = path.join(
      __dirname,
      '../../course-data/degree-reqs',
    );
    const courseListsDir = path.join(
      __dirname,
      '../../course-data/course-lists/updated_courses',
    );

    // 2. Load all course JSONs
    console.log('[SEED] Loading course data...');
    const courseMap = loadAllCourseJsons(courseListsDir);
    console.log(`[SEED] Loaded ${courseMap.size} courses`);

    // 3. Upsert all courses
    console.log('[SEED] Upserting courses...');
    for (const [code, courseData] of courseMap.entries()) {
      const title = courseData.title;
      const credits = courseData.credits ?? 3;
      const description =
        courseData.description ?? `No description for ${code}`;
      const offeredIn = courseData.offeredIn ?? [];
      const prerequisites = parseRequisites(courseData.prerequisites);
      const corequisites = parseRequisites(courseData.corequisites);

      await upsertCourse(
        code,
        title,
        credits,
        description,
        offeredIn,
        prerequisites,
        corequisites,
      );
    }
    console.log('[SEED] All courses upserted successfully');

    // 4. Read all requirement files
    console.log('[SEED] Loading degree requirements...');
    const files = await readdir(requirementsDir);
    const requirementFiles = files.filter((file) => file.endsWith('.txt'));

    if (requirementFiles.length === 0) {
      console.warn('[SEED] No requirement files found');
      return;
    }

    // 5. Upsert all degrees
    console.log('[SEED] Upserting degrees...');
    for (const file of requirementFiles) {
      const filePath = path.join(requirementsDir, file);
      console.log(`[SEED] Processing: ${file}`);

      const { degreeId, degreeName, totalCredits, requirements, isAddon } =
        parseRequirementsFile(filePath);

      await upsertDegree(
        degreeId,
        degreeName,
        totalCredits,
        isAddon,
        requirements,
      );
    }

    console.log('[SEED] Database seeding completed successfully!');
  } catch (error) {
    Sentry.captureException(error);
    console.error('[SEED] Error during database seeding:', error);
    throw error;
  }
}

// If running from command line: `ts-node seedService.ts`
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seed completed');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
