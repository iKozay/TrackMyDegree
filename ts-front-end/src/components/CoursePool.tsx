import React, { useMemo, useState } from "react";
import { PoolHeader } from "./PoolHeader";
import { PoolCoursesList } from "./PoolCoursesList";
import type { CourseMap, CourseCode } from "../types/timeline.types";
import { type CoursePoolData } from "@trackmydegree/shared";

interface CoursePoolProps {
  pools: CoursePoolData[];
  courses: CourseMap;
  onCourseSelect: (courseId: CourseCode) => void;
  selectedCourse?: CourseCode | null;
}

type ExpandedPoolsState = Record<string, boolean>;

const CoursePool: React.FC<CoursePoolProps> = ({
  pools,
  courses,
  onCourseSelect,
  selectedCourse,
}) => {
  const [expandedPools, setExpandedPools] = useState<ExpandedPoolsState>(() =>
    Object.fromEntries(pools.map((p) => [p.name, false]))
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [hideEmptyPools, setHideEmptyPools] = useState(true);
  const hasActiveSearch = searchTerm.trim().length > 0;
  const search = searchTerm.trim().toLowerCase();

  const togglePool = (name: string) =>
    setExpandedPools((prev) => ({ ...prev, [name]: !prev[name] }));

  const normalizeCourseCode = (code: string): string => {
    const compactCode = code.replace(/\s+/g, "");
    const firstDigitIndex = compactCode.search(/\d/);

    if (firstDigitIndex <= 0) {
      return compactCode.toUpperCase();
    }

    return `${compactCode.slice(0, firstDigitIndex)} ${compactCode.slice(firstDigitIndex)}`.toUpperCase();
  };

  const normalizedCourseKeyMap = useMemo(() => {
    const map = new Map<string, CourseCode>();
    for (const [key, course] of Object.entries(courses)) {
      map.set(normalizeCourseCode(key), key);
      map.set(normalizeCourseCode(course.id), key);
    }
    return map;
  }, [courses]);

  const resolveCourseKey = (courseId: CourseCode): CourseCode | null => {
    if (courses[courseId]) return courseId;
    return normalizedCourseKeyMap.get(normalizeCourseCode(courseId)) ?? null;
  };

  const isInTimeline = (courseId: CourseCode): boolean => {
    const resolvedKey = resolveCourseKey(courseId);
    if (!resolvedKey) return false;
    const status = courses[resolvedKey]?.status?.status;
    return status === "completed" || status === "planned";
  };

  const formatPoolName = (name: string) => {
    // Modify ECP course pools to retain 'ECP' and format the rest of the name
    if (name.startsWith("ECP_")) {
      return name.replace("ECP_", "ECP ").replace(/_/g, " ");
    }
    return name; // Return the name unchanged for non-ECP course pools
  };

  return (
    <div className="course-pool">
      <h2>Course Pool</h2>
      <div className="course-pool-search">
        <input
          type="text"
          placeholder="Search courses by code or title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="course-pool-search-input"
        />
      </div>

      <label className="course-pool-toggle">
        <input
          type="checkbox"
          checked={hideEmptyPools}
          onChange={(e) => setHideEmptyPools(e.target.checked)}
        />
        Hide empty pools
      </label>

      {pools.map((pool, index) => {
        const resolvedPoolCourseIds = pool.courses
          .map((courseId) => resolveCourseKey(courseId))
          .filter((courseId): courseId is CourseCode => !!courseId);

        // Hide completed/planned courses because they are already shown on the timeline.
        const incompleteCourseIds = resolvedPoolCourseIds.filter(
          (courseId) => !isInTimeline(courseId)
        );

        // Filter incomplete courses for this pool based on search
        const visibleCourseIds: CourseCode[] = hasActiveSearch
          ? incompleteCourseIds.filter((courseId) => {
              const course = courses[courseId];
              if (!course) return false;
              const code = course.id.toLowerCase();
              const title = course.title.toLowerCase();
              return code.includes(search) || title.includes(search);
            })
          : incompleteCourseIds;
        const isEmptyPool = visibleCourseIds.length === 0;

        if (hideEmptyPools && isEmptyPool) return null;

        const isExpanded = hasActiveSearch
          ? visibleCourseIds.length > 0 // when searching, auto-expand pools with matches
          : !!expandedPools[pool.name];

        return (
          <div key={`${pool.name}-${index}`} className="pool-section">
            <PoolHeader
              pool={{ ...pool, name: formatPoolName(pool.name) }}
              isExpanded={isExpanded}
              onToggle={() => {
                if (!isEmptyPool) togglePool(pool.name);
              }}
              courses={courses}
              disabled={!hasActiveSearch && isEmptyPool}
            />

            {isExpanded && (
              <PoolCoursesList
                pool={{ ...pool, name: formatPoolName(pool.name) }}
                visibleCourseIds={visibleCourseIds}
                courses={courses}
                selectedCourse={selectedCourse}
                onCourseSelect={onCourseSelect}
              />
            )}

            {!hasActiveSearch && isEmptyPool && (
              <div className="pool-empty-message">
                All courses are already planned or completed.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CoursePool;
