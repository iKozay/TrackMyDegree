import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Course, CoursePool, Degree, EntityVersionDiff } from '@models';
import {
  DEFAULT_BASE_ACADEMIC_YEAR,
  compareAcademicYears,
  applyVersionPatch,
  normalizeAcademicYear,
  VersionPatch,
  VersionedEntityType,
} from '@services/catalogVersionService';

dotenv.config();

interface DegreeSeedData {
  _id: string;
  name: string;
  totalCredits: number;
  coursePools?: string[];
  degreeType?: string;
  ecpDegreeId?: string;
  baseAcademicYear?: string;
}

interface CoursePoolSeedData {
  _id: string;
  name: string;
  creditsRequired: number;
  courses?: string[];
  baseAcademicYear?: string;
}

interface CourseSeedData {
  _id: string;
  title: string;
  description: string;
  credits: number;
  offeredIn?: string[];
  prereqCoreqText?: string;
  rules?: {
    prereq?: string[][];
    coreq?: string[][];
    not_taken?: string[];
    min_credits?: number;
  };
  notes?: string;
  components?: string[];
  baseAcademicYear?: string;
}

interface DiffPayload {
  entityId: string;
  academicYear?: string;
  patch: VersionPatch;
}

interface CatalogPatchFile {
  academicYear: string;
  baseEntities?: {
    degrees?: DegreeSeedData[];
    coursePools?: CoursePoolSeedData[];
    courses?: CourseSeedData[];
  };
  diffs?: {
    degrees?: DiffPayload[];
    coursePools?: DiffPayload[];
    courses?: DiffPayload[];
  };
}

interface OperationSummary {
  upsertedDegrees: number;
  upsertedCoursePools: number;
  upsertedCourses: number;
  upsertedDiffs: number;
}

export function parseArgs(argv: string[]) {
  const args = new Map<string, string | boolean>();

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (!value.startsWith('--')) continue;

    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args.set(value, true);
      continue;
    }

    args.set(value, next);
    index += 1;
  }

  return {
    file: args.get('--file') as string | undefined,
    apply: Boolean(args.get('--apply')),
    dryRun: !args.get('--apply'),
  };
}

export function getMongoUri(): string {
  return (
    process.env.MONGODB_URI ||
    'mongodb://admin:changeme123@localhost:27017/trackmydegree?authSource=admin'
  );
}

export function getDiffId(
  entityType: VersionedEntityType,
  entityId: string,
  academicYear: string,
): string {
  return `${entityType}:${entityId}:${academicYear}`;
}

export function ensurePatchShape(patch: VersionPatch, label: string): void {
  if (!Array.isArray(patch) || patch.length === 0) {
    throw new Error(
      `${label} patch must contain at least one JSON Patch operation.`,
    );
  }
}

export function normalizeBaseDegrees(
  degrees: DegreeSeedData[] = [],
  academicYear: string,
): DegreeSeedData[] {
  return degrees.map((degree) => ({
    ...degree,
    coursePools: degree.coursePools || [],
    ecpDegreeId: degree.ecpDegreeId || '',
    baseAcademicYear:
      normalizeAcademicYear(degree.baseAcademicYear) || academicYear,
  }));
}

export function normalizeBaseCoursePools(
  coursePools: CoursePoolSeedData[] = [],
  academicYear: string,
): CoursePoolSeedData[] {
  return coursePools.map((coursePool) => ({
    ...coursePool,
    courses: coursePool.courses || [],
    baseAcademicYear:
      normalizeAcademicYear(coursePool.baseAcademicYear) || academicYear,
  }));
}

export function normalizeBaseCourses(
  courses: CourseSeedData[] = [],
  academicYear: string,
): CourseSeedData[] {
  return courses.map((course) => ({
    ...course,
    baseAcademicYear:
      normalizeAcademicYear(course.baseAcademicYear) || academicYear,
  }));
}

export function normalizeDiffs(
  entityType: VersionedEntityType,
  diffs: DiffPayload[] = [],
  academicYear: string,
) {
  return diffs.map((diff) => {
    const resolvedAcademicYear =
      normalizeAcademicYear(diff.academicYear) || academicYear;

    ensurePatchShape(diff.patch, `${entityType} diff for ${diff.entityId}`);

    return {
      _id: getDiffId(entityType, diff.entityId, resolvedAcademicYear),
      entityType,
      entityId: diff.entityId,
      academicYear: resolvedAcademicYear,
      academicYearStart: Number.parseInt(resolvedAcademicYear.slice(0, 4), 10),
      patch: diff.patch,
    };
  });
}

export async function readPatchFile(
  filePath: string,
): Promise<CatalogPatchFile> {
  const absolutePath = path.resolve(filePath);
  const raw = await fs.readFile(absolutePath, 'utf8');
  const parsed = JSON.parse(raw) as CatalogPatchFile;

  if (!parsed.academicYear) {
    throw new Error('Patch file must include "academicYear".');
  }

  return parsed;
}

type ExistingEntityIds = {
  knownDegrees: Set<string>;
  knownCoursePools: Set<string>;
  knownCourses: Set<string>;
};

type NormalizedDiff = {
  _id: string;
  entityType: VersionedEntityType;
  entityId: string;
  academicYear: string;
  academicYearStart: number;
  patch: VersionPatch;
};

type CatalogState = {
  degreeState: Map<string, DegreeSeedData>;
  coursePoolState: Map<string, CoursePoolSeedData>;
  courseState: Map<string, CourseSeedData>;
};

export function toStringId(value: unknown): string {
  return String(value);
}

export function collectReferencedIds(payload: {
  degrees: DegreeSeedData[];
  coursePools: CoursePoolSeedData[];
  diffs: Array<{
    entityType: VersionedEntityType;
    entityId: string;
  }>;
}): {
  referencedDegreeIds: Set<string>;
  referencedCoursePoolIds: Set<string>;
  referencedCourseIds: Set<string>;
} {
  return {
    referencedDegreeIds: new Set(
      payload.diffs
        .filter((diff) => diff.entityType === 'Degree')
        .map((diff) => diff.entityId),
    ),
    referencedCoursePoolIds: new Set([
      ...payload.degrees.flatMap((degree) => degree.coursePools || []),
      ...payload.diffs
        .filter((diff) => diff.entityType === 'CoursePool')
        .map((diff) => diff.entityId),
    ]),
    referencedCourseIds: new Set([
      ...payload.coursePools.flatMap((coursePool) => coursePool.courses || []),
      ...payload.diffs
        .filter((diff) => diff.entityType === 'Course')
        .map((diff) => diff.entityId),
    ]),
  };
}

export async function loadKnownEntityIds(payload: {
  degrees: DegreeSeedData[];
  coursePools: CoursePoolSeedData[];
  courses: CourseSeedData[];
  diffs: Array<{
    entityType: VersionedEntityType;
    entityId: string;
  }>;
}): Promise<ExistingEntityIds> {
  const newDegreeIds = new Set(payload.degrees.map((degree) => degree._id));
  const newCoursePoolIds = new Set(
    payload.coursePools.map((coursePool) => coursePool._id),
  );
  const newCourseIds = new Set(payload.courses.map((course) => course._id));
  const { referencedDegreeIds, referencedCoursePoolIds, referencedCourseIds } =
    collectReferencedIds(payload);

  const [existingDegrees, existingCoursePools, existingCourses] =
    await Promise.all([
      Degree.find(
        {
          _id: {
            $in: Array.from(referencedDegreeIds),
          },
        },
        { _id: 1 },
      )
        .lean()
        .exec(),
      CoursePool.find(
        {
          _id: {
            $in: Array.from(referencedCoursePoolIds),
          },
        },
        { _id: 1 },
      )
        .lean()
        .exec(),
      Course.find(
        {
          _id: {
            $in: Array.from(referencedCourseIds),
          },
        },
        { _id: 1 },
      )
        .lean()
        .exec(),
    ]);

  return {
    knownDegrees: new Set([
      ...newDegreeIds,
      ...existingDegrees.map((degree) => toStringId(degree._id)),
    ]),
    knownCoursePools: new Set([
      ...newCoursePoolIds,
      ...existingCoursePools.map((coursePool) => toStringId(coursePool._id)),
    ]),
    knownCourses: new Set([
      ...newCourseIds,
      ...existingCourses.map((course) => toStringId(course._id)),
    ]),
  };
}

export function validateBaseEntityReferences(
  payload: {
    degrees: DegreeSeedData[];
    coursePools: CoursePoolSeedData[];
  },
  knownIds: ExistingEntityIds,
): void {
  for (const degree of payload.degrees) {
    for (const coursePoolId of degree.coursePools || []) {
      if (!knownIds.knownCoursePools.has(coursePoolId)) {
        throw new Error(
          `Degree ${degree._id} references unknown course pool ${coursePoolId}.`,
        );
      }
    }
  }

  for (const coursePool of payload.coursePools) {
    for (const courseId of coursePool.courses || []) {
      if (!knownIds.knownCourses.has(courseId)) {
        throw new Error(
          `Course pool ${coursePool._id} references unknown course ${courseId}.`,
        );
      }
    }
  }
}

export function validateDiffTarget(
  diff: {
    _id: string;
    entityType: VersionedEntityType;
    entityId: string;
  },
  knownIds: ExistingEntityIds,
): void {
  const entitySets: Record<VersionedEntityType, Set<string>> = {
    Degree: knownIds.knownDegrees,
    CoursePool: knownIds.knownCoursePools,
    Course: knownIds.knownCourses,
  };

  const entityLabels: Record<VersionedEntityType, string> = {
    Degree: 'degree',
    CoursePool: 'course pool',
    Course: 'course',
  };

  if (!entitySets[diff.entityType].has(diff.entityId)) {
    throw new Error(
      `Diff ${diff._id} targets unknown ${entityLabels[diff.entityType]} ${diff.entityId}.`,
    );
  }
}

export async function validateReferences(payload: {
  degrees: DegreeSeedData[];
  coursePools: CoursePoolSeedData[];
  courses: CourseSeedData[];
  diffs: NormalizedDiff[];
}): Promise<void> {
  const knownIds = await loadKnownEntityIds(payload);

  validateBaseEntityReferences(payload, knownIds);

  for (const diff of payload.diffs) {
    validateDiffTarget(diff, knownIds);
  }

  const state = await loadCatalogState(knownIds, payload);
  const diffsByYear = groupDiffsByAcademicYear(payload.diffs);
  const academicYears = Array.from(diffsByYear.keys()).sort(
    compareAcademicYears,
  );

  for (const academicYear of academicYears) {
    applyDiffsForAcademicYear(state, diffsByYear.get(academicYear) || []);
    assertResolvedReferences(state, academicYear);
  }
}

export async function loadCatalogState(
  knownIds: ExistingEntityIds,
  payload: {
    degrees: DegreeSeedData[];
    coursePools: CoursePoolSeedData[];
    courses: CourseSeedData[];
  },
): Promise<CatalogState> {
  const [existingDegrees, existingCoursePools, existingCourses] =
    await Promise.all([
      Degree.find(
        { _id: { $in: Array.from(knownIds.knownDegrees) } },
        {
          _id: 1,
          name: 1,
          totalCredits: 1,
          coursePools: 1,
          degreeType: 1,
          ecpDegreeId: 1,
          baseAcademicYear: 1,
        },
      )
        .lean<DegreeSeedData[]>()
        .exec(),
      CoursePool.find(
        { _id: { $in: Array.from(knownIds.knownCoursePools) } },
        {
          _id: 1,
          name: 1,
          creditsRequired: 1,
          courses: 1,
          baseAcademicYear: 1,
        },
      )
        .lean<CoursePoolSeedData[]>()
        .exec(),
      Course.find(
        { _id: { $in: Array.from(knownIds.knownCourses) } },
        {
          _id: 1,
          title: 1,
          description: 1,
          credits: 1,
          offeredIn: 1,
          prereqCoreqText: 1,
          rules: 1,
          notes: 1,
          components: 1,
          baseAcademicYear: 1,
        },
      )
        .lean<CourseSeedData[]>()
        .exec(),
    ]);

  const degreeState = new Map(
    existingDegrees.map((degree) => [degree._id, degree]),
  );
  const coursePoolState = new Map(
    existingCoursePools.map((coursePool) => [coursePool._id, coursePool]),
  );
  const courseState = new Map(
    existingCourses.map((course) => [course._id, course]),
  );

  for (const degree of payload.degrees) {
    degreeState.set(degree._id, degree);
  }

  for (const coursePool of payload.coursePools) {
    coursePoolState.set(coursePool._id, coursePool);
  }

  for (const course of payload.courses) {
    courseState.set(course._id, course);
  }

  return { degreeState, coursePoolState, courseState };
}

export function groupDiffsByAcademicYear(
  diffs: NormalizedDiff[],
): Map<string, NormalizedDiff[]> {
  const diffsByYear = new Map<string, NormalizedDiff[]>();
  for (const diff of diffs) {
    const items = diffsByYear.get(diff.academicYear) || [];
    items.push(diff);
    diffsByYear.set(diff.academicYear, items);
  }

  return diffsByYear;
}

export function applyDiffsForAcademicYear(
  state: CatalogState,
  diffs: NormalizedDiff[],
): void {
  for (const diff of diffs) {
    if (diff.entityType === 'Degree') {
      const degree = state.degreeState.get(diff.entityId);
      if (!degree) {
        throw new Error(`Missing degree state for diff ${diff._id}.`);
      }
      state.degreeState.set(
        diff.entityId,
        applyVersionPatch(degree, diff.patch),
      );
      continue;
    }

    if (diff.entityType === 'CoursePool') {
      const coursePool = state.coursePoolState.get(diff.entityId);
      if (!coursePool) {
        throw new Error(`Missing course pool state for diff ${diff._id}.`);
      }
      state.coursePoolState.set(
        diff.entityId,
        applyVersionPatch(coursePool, diff.patch),
      );
      continue;
    }

    const course = state.courseState.get(diff.entityId);
    if (!course) {
      throw new Error(`Missing course state for diff ${diff._id}.`);
    }
    state.courseState.set(diff.entityId, applyVersionPatch(course, diff.patch));
  }
}

export function assertResolvedReferences(
  state: CatalogState,
  academicYear: string,
): void {
  for (const degree of state.degreeState.values()) {
    for (const coursePoolId of degree.coursePools || []) {
      if (!state.coursePoolState.has(coursePoolId)) {
        throw new Error(
          `Academic year ${academicYear}: degree ${degree._id} references missing course pool ${coursePoolId}.`,
        );
      }
    }
  }

  for (const coursePool of state.coursePoolState.values()) {
    for (const courseId of coursePool.courses || []) {
      if (!state.courseState.has(courseId)) {
        throw new Error(
          `Academic year ${academicYear}: course pool ${coursePool._id} references missing course ${courseId}.`,
        );
      }
    }
  }
}

export async function applyPatchFile(
  patchFile: CatalogPatchFile,
  apply: boolean,
): Promise<OperationSummary> {
  const academicYear =
    normalizeAcademicYear(patchFile.academicYear) || DEFAULT_BASE_ACADEMIC_YEAR;

  const degrees = normalizeBaseDegrees(
    patchFile.baseEntities?.degrees,
    academicYear,
  );
  const coursePools = normalizeBaseCoursePools(
    patchFile.baseEntities?.coursePools,
    academicYear,
  );
  const courses = normalizeBaseCourses(
    patchFile.baseEntities?.courses,
    academicYear,
  );

  const diffs = [
    ...normalizeDiffs('Degree', patchFile.diffs?.degrees, academicYear),
    ...normalizeDiffs('CoursePool', patchFile.diffs?.coursePools, academicYear),
    ...normalizeDiffs('Course', patchFile.diffs?.courses, academicYear),
  ];

  await validateReferences({ degrees, coursePools, courses, diffs });

  if (apply) {
    for (const degree of degrees) {
      await Degree.updateOne(
        { _id: degree._id },
        { $set: degree },
        {
          upsert: true,
        },
      );
    }

    for (const coursePool of coursePools) {
      await CoursePool.updateOne(
        { _id: coursePool._id },
        { $set: coursePool },
        { upsert: true },
      );
    }

    for (const course of courses) {
      await Course.updateOne(
        { _id: course._id },
        { $set: course },
        {
          upsert: true,
        },
      );
    }

    for (const diff of diffs) {
      await EntityVersionDiff.updateOne(
        {
          entityType: diff.entityType,
          entityId: diff.entityId,
          academicYear: diff.academicYear,
        },
        { $set: diff },
        { upsert: true },
      );
    }
  }

  return {
    upsertedDegrees: degrees.length,
    upsertedCoursePools: coursePools.length,
    upsertedCourses: courses.length,
    upsertedDiffs: diffs.length,
  };
}

export function printUsage(): void {
  console.log(
    [
      'Usage:',
      '  npm run catalog:patch -- --file ./path/to/patch.json [--apply]',
      '',
      'Behavior:',
      '  default: dry-run validation only',
      '  --apply: writes base entities and diffs to MongoDB',
    ].join('\n'),
  );
}

export async function main() {
  const { file, apply, dryRun } = parseArgs(process.argv.slice(2));

  if (!file) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const mongoUri = getMongoUri();
  await mongoose.connect(mongoUri);

  try {
    const patchFile = await readPatchFile(file);
    const summary = await applyPatchFile(patchFile, apply);

    console.log(
      JSON.stringify(
        {
          mode: dryRun ? 'dry-run' : 'apply',
          file: path.resolve(file),
          academicYear: normalizeAcademicYear(patchFile.academicYear),
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
