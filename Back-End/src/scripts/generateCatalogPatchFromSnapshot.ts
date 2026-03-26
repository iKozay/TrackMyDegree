import dotenv from 'dotenv';
import { Operation } from 'fast-json-patch';
import { Course, CoursePool, Degree } from '@models';
import {
  normalizeAcademicYear,
  JsonPatch,
} from '@services/catalogVersionService';

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
  patch: JsonPatch;
};

// eslint-disable-next-line no-unused-vars
type BuildDiff<T> = (current: T, next: T) => JsonPatch | null;

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

export function sortUnique(values: string[] = []): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export function normalizeRules(rules?: CourseRules): Required<CourseRules> {
  const normalizeGroups = (groups: string[][]) => {
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

export function normalizeCourse(
  course: CourseType,
  academicYear: string,
): CourseType {
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

export function normalizeCoursePool(
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

export function normalizeDegree(
  degree: DegreeType,
  academicYear: string,
): DegreeType {
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

export function compactPatch(patch: JsonPatch): JsonPatch | null {
  return patch.length > 0 ? patch : null;
}

export function stripVersionMetadata<T extends { baseAcademicYear?: string }>(
  entity: T,
): Omit<T, 'baseAcademicYear'> {
  const { baseAcademicYear: _baseAcademicYear, ...rest } = entity;
  return rest;
}

export function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function escapeJsonPointerSegment(segment: string): string {
  return segment.replaceAll('~', '~0').replaceAll('/', '~1');
}

export function buildJsonPatch<T extends { baseAcademicYear?: string }>(
  current: T,
  next: T,
): JsonPatch | null {
  const currentEntity = stripVersionMetadata(current) as Record<
    string,
    unknown
  >;
  const nextEntity = stripVersionMetadata(next) as Record<string, unknown>;
  const keys = Array.from(
    new Set([...Object.keys(currentEntity), ...Object.keys(nextEntity)]),
  ).sort((left, right) => left.localeCompare(right));

  const patch: Operation[] = [];

  for (const key of keys) {
    const path = `/${escapeJsonPointerSegment(key)}`;
    const currentValue = currentEntity[key];
    const nextValue = nextEntity[key];
    const hasCurrent = Object.hasOwn(currentEntity, key);
    const hasNext = Object.hasOwn(nextEntity, key);

    if (!hasNext) {
      patch.push({ op: 'remove', path });
      continue;
    }

    if (!hasCurrent) {
      patch.push({ op: 'add', path, value: nextValue });
      continue;
    }

    if (!sameValue(currentValue, nextValue)) {
      patch.push({ op: 'replace', path, value: nextValue });
    }
  }

  return compactPatch(patch);
}

export function normalizeSnapshot(snapshot: CatalogSnapshot): CatalogSnapshot {
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

export function buildCurrentEntityMaps(
  dbDegrees: DegreeType[],
  dbCoursePools: CoursePoolType[],
  dbCourses: CourseType[],
  academicYear: string,
): {
  currentDegrees: Map<string, DegreeType>;
  currentCoursePools: Map<string, CoursePoolType>;
  currentCourses: Map<string, CourseType>;
} {
  return {
    currentDegrees: new Map(
      dbDegrees.map((degree) => [
        degree._id,
        normalizeDegree(degree, degree.baseAcademicYear || academicYear),
      ]),
    ),
    currentCoursePools: new Map(
      dbCoursePools.map((coursePool) => [
        coursePool._id,
        normalizeCoursePool(
          coursePool,
          coursePool.baseAcademicYear || academicYear,
        ),
      ]),
    ),
    currentCourses: new Map(
      dbCourses.map((course) => [
        course._id,
        normalizeCourse(course, course.baseAcademicYear || academicYear),
      ]),
    ),
  };
}

export function addBaseEntity<T extends { baseAcademicYear?: string }>(
  entities: T[],
  entity: T,
  academicYear: string,
): void {
  entities.push({
    ...entity,
    baseAcademicYear: academicYear,
  });
}

export function appendEntityChanges<
  T extends { _id: string; baseAcademicYear?: string },
>(
  entities: Iterable<T>,
  currentEntities: Map<string, T>,
  academicYear: string,
  baseEntities: T[],
  diffs: DiffPayload[],
  buildDiff: BuildDiff<T>,
): void {
  for (const entity of entities) {
    const current = currentEntities.get(entity._id);

    if (!current) {
      addBaseEntity(baseEntities, entity, academicYear);
      continue;
    }

    const diff = buildDiff(current, entity);
    if (diff) {
      diffs.push({
        entityId: entity._id,
        academicYear,
        patch: diff,
      });
    }
  }
}

export function sortPatchCollections(patch: CatalogPatch): void {
  patch.baseEntities.degrees.sort((left, right) =>
    left._id.localeCompare(right._id),
  );
  patch.baseEntities.coursePools.sort((left, right) =>
    left._id.localeCompare(right._id),
  );
  patch.baseEntities.courses.sort((left, right) =>
    left._id.localeCompare(right._id),
  );
  patch.diffs.degrees.sort((left, right) =>
    left.entityId.localeCompare(right.entityId),
  );
  patch.diffs.coursePools.sort((left, right) =>
    left.entityId.localeCompare(right.entityId),
  );
  patch.diffs.courses.sort((left, right) =>
    left.entityId.localeCompare(right.entityId),
  );
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

  const { currentDegrees, currentCoursePools, currentCourses } =
    buildCurrentEntityMaps(dbDegrees, dbCoursePools, dbCourses, academicYear);

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

  appendEntityChanges(
    scrapedCourses.values(),
    currentCourses,
    academicYear,
    patch.baseEntities.courses,
    patch.diffs.courses,
    buildJsonPatch,
  );
  appendEntityChanges(
    scrapedCoursePools.values(),
    currentCoursePools,
    academicYear,
    patch.baseEntities.coursePools,
    patch.diffs.coursePools,
    buildJsonPatch,
  );
  appendEntityChanges(
    scrapedDegrees.values(),
    currentDegrees,
    academicYear,
    patch.baseEntities.degrees,
    patch.diffs.degrees,
    buildJsonPatch,
  );

  sortPatchCollections(patch);

  return patch;
}
