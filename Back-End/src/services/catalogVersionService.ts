import { EntityVersionDiff } from '@models';

export const DEFAULT_BASE_ACADEMIC_YEAR = '2025-2026';

export type VersionedEntityType = 'Degree' | 'CoursePool' | 'Course';

export interface VersionPatch {
  set?: Record<string, unknown>;
  unset?: string[];
  addToSet?: Record<string, unknown[]>;
  pull?: Record<string, unknown[]>;
}

export interface EntityVersionDiffData {
  entityType: VersionedEntityType;
  entityId: string;
  academicYear: string;
  patch?: VersionPatch;
}

interface ResolveEntityOptions<T> {
  entityType: VersionedEntityType;
  entityId: string;
  baseEntity: T;
  academicYear?: string;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function parseAcademicYearStart(value: string): number {
  const normalized = normalizeAcademicYear(value) as string;
  return Number.parseInt(normalized.slice(0, 4), 10);
}

export function normalizeAcademicYear(value?: string): string | undefined {
  if (!value) return undefined;

  const trimmed = value.trim();

  if (/^\d{4}$/.test(trimmed)) {
    const start = Number.parseInt(trimmed, 10);
    return `${start}-${start + 1}`;
  }

  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    const start = Number.parseInt(trimmed.slice(0, 4), 10);
    const endSuffix = Number.parseInt(trimmed.slice(5), 10);
    const century = Math.floor(start / 100) * 100;
    return `${start}-${century + endSuffix}`;
  }

  if (/^\d{4}-\d{4}$/.test(trimmed)) {
    const start = Number.parseInt(trimmed.slice(0, 4), 10);
    const end = Number.parseInt(trimmed.slice(5), 10);

    if (end !== start + 1) {
      throw new Error(
        `Invalid academic year "${value}". Expected consecutive years.`,
      );
    }

    return trimmed;
  }

  throw new Error(
    `Invalid academic year "${value}". Use YYYY-YYYY or YYYY format.`,
  );
}

function compareAcademicYears(a: string, b: string): number {
  return parseAcademicYearStart(a) - parseAcademicYearStart(b);
}

function setValueAtPath(
  target: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const parts = path.split('.');
  let current: Record<string, unknown> = target;

  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = parts[index];
    const next = current[key];

    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      current[key] = {};
    }

    current = current[key] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}

function getValueAtPath(target: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[key];
  }, target);
}

function deleteValueAtPath(target: Record<string, unknown>, path: string): void {
  const parts = path.split('.');
  let current: Record<string, unknown> = target;

  for (let index = 0; index < parts.length - 1; index += 1) {
    const next = current[parts[index]];
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      return;
    }
    current = next as Record<string, unknown>;
  }

  delete current[parts[parts.length - 1]];
}

function applyArrayOperation(
  target: Record<string, unknown>,
  path: string,
  items: unknown[],
  mode: 'add' | 'remove',
): void {
  const currentValue = getValueAtPath(target, path);
  const currentArray = Array.isArray(currentValue) ? [...currentValue] : [];

  if (mode === 'add') {
    for (const item of items) {
      if (!currentArray.some((existing) => existing === item)) {
        currentArray.push(item);
      }
    }
  } else {
    for (const item of items) {
      let index = currentArray.findIndex((existing) => existing === item);
      while (index >= 0) {
        currentArray.splice(index, 1);
        index = currentArray.findIndex((existing) => existing === item);
      }
    }
  }

  setValueAtPath(target, path, currentArray);
}

export function applyVersionPatch<T>(baseEntity: T, patch?: VersionPatch): T {
  if (!patch) {
    return deepClone(baseEntity);
  }

  const nextEntity = deepClone(baseEntity) as Record<string, unknown>;

  for (const [path, value] of Object.entries(patch.set || {})) {
    setValueAtPath(nextEntity, path, deepClone(value));
  }

  for (const path of patch.unset || []) {
    deleteValueAtPath(nextEntity, path);
  }

  for (const [path, items] of Object.entries(patch.addToSet || {})) {
    applyArrayOperation(nextEntity, path, items, 'add');
  }

  for (const [path, items] of Object.entries(patch.pull || {})) {
    applyArrayOperation(nextEntity, path, items, 'remove');
  }

  return nextEntity as T;
}

export function getLatestAcademicYear(
  baseAcademicYear: string,
  diffs: EntityVersionDiffData[],
): string {
  return diffs.reduce((latest, diff) => {
    return compareAcademicYears(diff.academicYear, latest) > 0
      ? diff.academicYear
      : latest;
  }, baseAcademicYear);
}

export async function resolveEntityVersion<T extends { baseAcademicYear?: string }>(
  options: ResolveEntityOptions<T>,
): Promise<{ entity: T; academicYear: string }> {
  const baseAcademicYear = normalizeAcademicYear(
    options.baseEntity.baseAcademicYear || DEFAULT_BASE_ACADEMIC_YEAR,
  ) as string;

  const diffs = await EntityVersionDiff.find({
    entityType: options.entityType,
    entityId: options.entityId,
  })
    .sort({ academicYear: 1 })
    .lean<EntityVersionDiffData[]>()
    .exec();

  const normalizedDiffs = diffs.map((diff) => ({
    ...diff,
    academicYear: normalizeAcademicYear(diff.academicYear) as string,
  }));

  const targetAcademicYear =
    normalizeAcademicYear(options.academicYear) ||
    getLatestAcademicYear(baseAcademicYear, normalizedDiffs);

  if (compareAcademicYears(targetAcademicYear, baseAcademicYear) < 0) {
    throw new Error(
      `Academic year ${targetAcademicYear} is earlier than base academic year ${baseAcademicYear}.`,
    );
  }

  const applicableDiffs = normalizedDiffs.filter((diff) => {
    return (
      compareAcademicYears(diff.academicYear, baseAcademicYear) > 0 &&
      compareAcademicYears(diff.academicYear, targetAcademicYear) <= 0
    );
  });

  const resolvedEntity = applicableDiffs.reduce<T>((entity, diff) => {
    return applyVersionPatch(entity, diff.patch);
  }, deepClone(options.baseEntity));

  resolvedEntity.baseAcademicYear = targetAcademicYear;

  return {
    entity: resolvedEntity,
    academicYear: targetAcademicYear,
  };
}
