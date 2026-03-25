import { EntityVersionDiff } from '@models';
import { Operation, applyPatch } from 'fast-json-patch';

export const DEFAULT_BASE_ACADEMIC_YEAR = '2025-2026';

export type VersionedEntityType = 'Degree' | 'CoursePool' | 'Course';

export type JsonPatch = Operation[];

export interface EntityVersionDiffData {
  entityType: VersionedEntityType;
  entityId: string;
  academicYear: string;
  academicYearStart?: number;
  patch?: JsonPatch;
}

interface ResolveEntityOptions<T> {
  entityType: VersionedEntityType;
  entityId: string;
  baseEntity: T;
  academicYear?: string;
  diffs?: EntityVersionDiffData[];
}

function deepClone<T>(value: T): T {
  return structuredClone(value);
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

export function compareAcademicYears(a: string, b: string): number {
  return parseAcademicYearStart(a) - parseAcademicYearStart(b);
}

export function applyVersionPatch<T>(baseEntity: T, patch?: JsonPatch): T {
  if (!patch) return deepClone(baseEntity);
  const result = applyPatch(deepClone(baseEntity), patch, true, false);
  return result.newDocument as T;
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

function normalizeDiff(diff: EntityVersionDiffData): EntityVersionDiffData {
  const academicYear = normalizeAcademicYear(diff.academicYear) as string;

  return {
    ...diff,
    academicYear,
    academicYearStart:
      diff.academicYearStart ?? parseAcademicYearStart(academicYear),
  };
}

export function resolveEntityVersionFromDiffs<
  T extends { baseAcademicYear?: string },
>(options: ResolveEntityOptions<T>): { entity: T; academicYear: string } {
  const baseAcademicYear = normalizeAcademicYear(
    options.baseEntity.baseAcademicYear || DEFAULT_BASE_ACADEMIC_YEAR,
  ) as string;
  const normalizedDiffs = (options.diffs || []).map(normalizeDiff);
  const targetAcademicYear =
    normalizeAcademicYear(options.academicYear) ||
    getLatestAcademicYear(baseAcademicYear, normalizedDiffs);

  if (compareAcademicYears(targetAcademicYear, baseAcademicYear) < 0) {
    throw new Error(
      `Academic year ${targetAcademicYear} is earlier than base academic year ${baseAcademicYear}.`,
    );
  }

  const applicableDiffs = normalizedDiffs
    .filter((diff) => {
      return (
        compareAcademicYears(diff.academicYear, baseAcademicYear) > 0 &&
        compareAcademicYears(diff.academicYear, targetAcademicYear) <= 0
      );
    })
    .sort((left, right) => {
      const byYear = compareAcademicYears(
        left.academicYear,
        right.academicYear,
      );
      if (byYear !== 0) return byYear;
      return left.entityId.localeCompare(right.entityId);
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

async function loadEntityDiffs(
  entityType: VersionedEntityType,
  entityIds: string[],
): Promise<Map<string, EntityVersionDiffData[]>> {
  const uniqueIds = [...new Set(entityIds)];

  const diffs = await EntityVersionDiff.find({
    entityType,
    entityId: { $in: uniqueIds },
  })
    .sort({ academicYearStart: 1, academicYear: 1, entityId: 1 })
    .lean<EntityVersionDiffData[]>()
    .exec();

  const grouped = new Map<string, EntityVersionDiffData[]>();
  for (const diff of diffs.map(normalizeDiff)) {
    const items = grouped.get(diff.entityId) || [];
    items.push(diff);
    grouped.set(diff.entityId, items);
  }

  return grouped;
}

export async function resolveEntityVersions<
  T extends { _id: string; baseAcademicYear?: string },
>(
  entityType: VersionedEntityType,
  entities: T[],
  academicYear?: string,
): Promise<T[]> {
  if (entities.length === 0) {
    return [];
  }

  const diffsByEntityId = await loadEntityDiffs(
    entityType,
    entities.map((entity) => entity._id),
  );

  return entities.map((entity) => {
    return resolveEntityVersionFromDiffs({
      entityType,
      entityId: entity._id,
      baseEntity: entity,
      academicYear,
      diffs: diffsByEntityId.get(entity._id) || [],
    }).entity;
  });
}

export async function resolveEntityVersion<
  T extends { baseAcademicYear?: string },
>(
  options: ResolveEntityOptions<T>,
): Promise<{ entity: T; academicYear: string }> {
  const diffs =
    options.diffs ||
    (await EntityVersionDiff.find({
      entityType: options.entityType,
      entityId: options.entityId,
    })
      .sort({ academicYearStart: 1, academicYear: 1 })
      .lean<EntityVersionDiffData[]>()
      .exec());

  return resolveEntityVersionFromDiffs({
    ...options,
    diffs,
  });
}
