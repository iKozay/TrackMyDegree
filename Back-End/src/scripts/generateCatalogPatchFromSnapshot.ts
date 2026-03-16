import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Course, CoursePool, Degree } from '@models';
import { normalizeAcademicYear, VersionPatch } from '@services/catalogVersionService';

dotenv.config();

type DegreeType = {
  _id: string;
  name: string;
  totalCredits: number;
  degreeType?: string;
  coursePools?: string[];
  ecpDegreeId?: string;
  baseAcademicYear?: string;
};

type CoursePoolType = {
  _id: string;
  name: string;
  creditsRequired: number;
  courses?: string[];
  baseAcademicYear?: string;
};

type CourseRules = {
  prereq?: string[][];
  coreq?: string[][];
  not_taken?: string[];
  min_credits?: number;
};

type CourseType = {
  _id: string;
  title: string;
  description: string;
  credits: number;
  offeredIn?: string[];
  offered_in?: string[];
  prereqCoreqText?: string;
  rules?: CourseRules;
  notes?: string;
  components?: string[];
  baseAcademicYear?: string;
};

type DegreeSnapshotEntry = {
  degree: DegreeType;
  coursePools: CoursePoolType[];
};

type CatalogSnapshot = {
  academicYear: string;
  degrees: DegreeSnapshotEntry[];
  courses: CourseType[];
};

type DiffPayload = {
  entityId: string;
  academicYear: string;
  patch: VersionPatch;
};

type CatalogPatch = {
  academicYear: string;
  baseEntities: {
    degrees: DegreeType[];
    coursePools: CoursePoolType[];
    courses: CourseType[];
  };
  diffs: {
    degrees: DiffPayload[];
    coursePools: DiffPayload[];
    courses: DiffPayload[];
  };
};

function parseArgs(argv: string[]) {
  const args = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith('--')) continue;

    const next = argv[index + 1];
    if (!next || next.startsWith('--')) continue;

    args.set(value, next);
    index += 1;
  }

  return {
    file: args.get('--file'),
    out: args.get('--out'),
  };
}

function getMongoUri(): string {
  return (
    process.env.MONGODB_URI ||
    'mongodb://admin:changeme123@localhost:27017/trackmydegree?authSource=admin'
  );
}

function sortUnique(values: string[] = []): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function normalizeRules(rules?: CourseRules): Required<CourseRules> {
  const normalizeGroups = (groups: string[][] = []) => {
    return groups
      .map((group) => sortUnique(group))
      .sort((left, right) =>
        JSON.stringify(left).localeCompare(JSON.stringify(right)),
      );
  };

  return {
    prereq: normalizeGroups(rules?.prereq || []),
    coreq: normalizeGroups(rules?.coreq || []),
    not_taken: sortUnique(rules?.not_taken || []),
    min_credits: Number(rules?.min_credits || 0),
  };
}

function normalizeCourse(course: CourseType, academicYear: string): CourseType {
  return {
    _id: course._id,
    title: course.title,
    description: course.description || '',
    credits: Number(course.credits || 0),
    offeredIn: sortUnique(course.offeredIn || course.offered_in || []),
    prereqCoreqText: course.prereqCoreqText || '',
    rules: normalizeRules(course.rules),
    notes: course.notes || '',
    components: sortUnique(course.components || []),
    baseAcademicYear:
      normalizeAcademicYear(course.baseAcademicYear) || academicYear,
  };
}

function normalizeCoursePool(
  coursePool: CoursePoolType,
  academicYear: string,
): CoursePoolType {
  return {
    _id: coursePool._id,
    name: coursePool.name,
    creditsRequired: Number(coursePool.creditsRequired || 0),
    courses: sortUnique(coursePool.courses || []),
    baseAcademicYear:
      normalizeAcademicYear(coursePool.baseAcademicYear) || academicYear,
  };
}

function normalizeDegree(degree: DegreeType, academicYear: string): DegreeType {
  return {
    _id: degree._id,
    name: degree.name,
    totalCredits: Number(degree.totalCredits || 0),
    degreeType: degree.degreeType,
    coursePools: sortUnique(degree.coursePools || []),
    ecpDegreeId: degree.ecpDegreeId || '',
    baseAcademicYear:
      normalizeAcademicYear(degree.baseAcademicYear) || academicYear,
  };
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function buildMembershipPatch(
  currentValues: string[] = [],
  nextValues: string[] = [],
  path: string,
): VersionPatch {
  const current = sortUnique(currentValues);
  const next = sortUnique(nextValues);
  const added = next.filter((value) => !current.includes(value));
  const removed = current.filter((value) => !next.includes(value));
  const patch: VersionPatch = {};

  if (added.length > 0) {
    patch.addToSet = { [path]: added };
  }

  if (removed.length > 0) {
    patch.pull = { [path]: removed };
  }

  return patch;
}

function mergePatch(base: VersionPatch, extra: VersionPatch): VersionPatch {
  return {
    set: { ...(base.set || {}), ...(extra.set || {}) },
    unset: [...(base.unset || []), ...(extra.unset || [])],
    addToSet: { ...(base.addToSet || {}), ...(extra.addToSet || {}) },
    pull: { ...(base.pull || {}), ...(extra.pull || {}) },
  };
}

function compactPatch(patch: VersionPatch): VersionPatch | null {
  const nextPatch: VersionPatch = {};

  if (patch.set && Object.keys(patch.set).length > 0) {
    nextPatch.set = patch.set;
  }

  if (patch.unset && patch.unset.length > 0) {
    nextPatch.unset = patch.unset;
  }

  if (patch.addToSet && Object.keys(patch.addToSet).length > 0) {
    nextPatch.addToSet = patch.addToSet;
  }

  if (patch.pull && Object.keys(patch.pull).length > 0) {
    nextPatch.pull = patch.pull;
  }

  return Object.keys(nextPatch).length > 0 ? nextPatch : null;
}

function buildDegreeDiff(
  current: DegreeType,
  next: DegreeType,
): VersionPatch | null {
  const set: Record<string, unknown> = {};

  for (const field of ['name', 'totalCredits', 'degreeType', 'ecpDegreeId'] as const) {
    if (!sameValue(current[field], next[field])) {
      set[field] = next[field] ?? '';
    }
  }

  const patch = mergePatch(
    Object.keys(set).length > 0 ? { set } : {},
    buildMembershipPatch(current.coursePools, next.coursePools, 'coursePools'),
  );

  return compactPatch(patch);
}

function buildCoursePoolDiff(
  current: CoursePoolType,
  next: CoursePoolType,
): VersionPatch | null {
  const set: Record<string, unknown> = {};

  for (const field of ['name', 'creditsRequired'] as const) {
    if (!sameValue(current[field], next[field])) {
      set[field] = next[field];
    }
  }

  const patch = mergePatch(
    Object.keys(set).length > 0 ? { set } : {},
    buildMembershipPatch(current.courses, next.courses, 'courses'),
  );

  return compactPatch(patch);
}

function buildCourseDiff(
  current: CourseType,
  next: CourseType,
): VersionPatch | null {
  const set: Record<string, unknown> = {};

  for (const field of [
    'title',
    'description',
    'credits',
    'prereqCoreqText',
    'notes',
    'offeredIn',
    'components',
    'rules',
  ] as const) {
    if (!sameValue(current[field], next[field])) {
      set[field] = next[field];
    }
  }

  return compactPatch(Object.keys(set).length > 0 ? { set } : {});
}

function normalizeSnapshot(snapshot: CatalogSnapshot): CatalogSnapshot {
  const academicYear = normalizeAcademicYear(snapshot.academicYear) as string;

  return {
    academicYear,
    degrees: snapshot.degrees.map((entry) => ({
      degree: normalizeDegree(entry.degree, academicYear),
      coursePools: entry.coursePools.map((coursePool) =>
        normalizeCoursePool(coursePool, academicYear),
      ),
    })),
    courses: snapshot.courses.map((course) =>
      normalizeCourse(course, academicYear),
    ),
  };
}

export async function generatePatchFromSnapshotData(
  rawSnapshot: CatalogSnapshot,
): Promise<CatalogPatch> {
  const snapshot = normalizeSnapshot(rawSnapshot);
  const academicYear = snapshot.academicYear;

  const [dbDegrees, dbCoursePools, dbCourses] = await Promise.all([
    Degree.find({}).lean<DegreeType[]>().exec(),
    CoursePool.find({}).lean<CoursePoolType[]>().exec(),
    Course.find({}).lean<CourseType[]>().exec(),
  ]);

  const currentDegrees = new Map(
    dbDegrees.map((degree) => [
      degree._id,
      normalizeDegree(degree, degree.baseAcademicYear || academicYear),
    ]),
  );
  const currentCoursePools = new Map(
    dbCoursePools.map((coursePool) => [
      coursePool._id,
      normalizeCoursePool(
        coursePool,
        coursePool.baseAcademicYear || academicYear,
      ),
    ]),
  );
  const currentCourses = new Map(
    dbCourses.map((course) => [
      course._id,
      normalizeCourse(course, course.baseAcademicYear || academicYear),
    ]),
  );

  const scrapedCoursePools = new Map<string, CoursePoolType>();
  for (const entry of snapshot.degrees) {
    for (const coursePool of entry.coursePools) {
      scrapedCoursePools.set(coursePool._id, coursePool);
    }
  }

  const scrapedDegrees = new Map(
    snapshot.degrees.map((entry) => [entry.degree._id, entry.degree]),
  );
  const scrapedCourses = new Map(
    snapshot.courses.map((course) => [course._id, course]),
  );

  const patch: CatalogPatch = {
    academicYear,
    baseEntities: {
      degrees: [],
      coursePools: [],
      courses: [],
    },
    diffs: {
      degrees: [],
      coursePools: [],
      courses: [],
    },
  };

  for (const course of scrapedCourses.values()) {
    const current = currentCourses.get(course._id);

    if (!current) {
      patch.baseEntities.courses.push({
        ...course,
        baseAcademicYear: academicYear,
      });
      continue;
    }

    const courseDiff = buildCourseDiff(current, course);
    if (courseDiff) {
      patch.diffs.courses.push({
        entityId: course._id,
        academicYear,
        patch: courseDiff,
      });
    }
  }

  for (const coursePool of scrapedCoursePools.values()) {
    const current = currentCoursePools.get(coursePool._id);

    if (!current) {
      patch.baseEntities.coursePools.push({
        ...coursePool,
        baseAcademicYear: academicYear,
      });
      continue;
    }

    const coursePoolDiff = buildCoursePoolDiff(current, coursePool);
    if (coursePoolDiff) {
      patch.diffs.coursePools.push({
        entityId: coursePool._id,
        academicYear,
        patch: coursePoolDiff,
      });
    }
  }

  for (const degree of scrapedDegrees.values()) {
    const current = currentDegrees.get(degree._id);

    if (!current) {
      patch.baseEntities.degrees.push({
        ...degree,
        baseAcademicYear: academicYear,
      });
      continue;
    }

    const degreeDiff = buildDegreeDiff(current, degree);
    if (degreeDiff) {
      patch.diffs.degrees.push({
        entityId: degree._id,
        academicYear,
        patch: degreeDiff,
      });
    }
  }

  patch.baseEntities.degrees.sort((left, right) => left._id.localeCompare(right._id));
  patch.baseEntities.coursePools.sort((left, right) =>
    left._id.localeCompare(right._id),
  );
  patch.baseEntities.courses.sort((left, right) => left._id.localeCompare(right._id));
  patch.diffs.degrees.sort((left, right) => left.entityId.localeCompare(right.entityId));
  patch.diffs.coursePools.sort((left, right) =>
    left.entityId.localeCompare(right.entityId),
  );
  patch.diffs.courses.sort((left, right) => left.entityId.localeCompare(right.entityId));

  return patch;
}

async function readSnapshotFile(filePath: string): Promise<CatalogSnapshot> {
  const absolutePath = path.resolve(filePath);
  const raw = await fs.readFile(absolutePath, 'utf8');
  return JSON.parse(raw) as CatalogSnapshot;
}

function resolveOutputPath(snapshotFile: string, out?: string): string {
  if (out) return path.resolve(out);

  const parsed = path.parse(snapshotFile);
  return path.resolve(parsed.dir, `${parsed.name}-patch.json`);
}

function printUsage(): void {
  console.log(
    [
      'Usage:',
      '  npm run catalog:generate-patch -- --file ./tmp/catalog-snapshot-2026-2027.json [--out ./tmp/catalog-patch-2026-2027.json]',
      '',
      'Behavior:',
      '  Reads a scraped snapshot file, compares it with MongoDB, and writes a patch JSON.',
    ].join('\n'),
  );
}

export async function main(): Promise<void> {
  const { file, out } = parseArgs(process.argv.slice(2));

  if (!file) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  await mongoose.connect(getMongoUri());

  try {
    const snapshot = await readSnapshotFile(file);
    const patch = await generatePatchFromSnapshotData(snapshot);
    const outputPath = resolveOutputPath(file, out);

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, `${JSON.stringify(patch, null, 2)}\n`, 'utf8');

    console.log(
      JSON.stringify(
        {
          outputPath,
          academicYear: patch.academicYear,
          summary: {
            newDegrees: patch.baseEntities.degrees.length,
            newCoursePools: patch.baseEntities.coursePools.length,
            newCourses: patch.baseEntities.courses.length,
            degreeDiffs: patch.diffs.degrees.length,
            coursePoolDiffs: patch.diffs.coursePools.length,
            courseDiffs: patch.diffs.courses.length,
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await mongoose.disconnect();
  }
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
