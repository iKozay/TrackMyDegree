import React, { useState } from "react";
import { PoolHeader } from "./PoolHeader";
import { PoolCoursesList } from "./PoolCoursesList";
import type { Pool, CourseMap, CourseCode } from "../types/timeline.types";

interface CoursePoolProps {
  pools: Pool[];
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
    Object.fromEntries(pools.map((p) => [p.name, false])),
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [showIncompleted, setShowIncompleted] = useState(true);
  const hasActiveSearch = searchTerm.trim().length > 0;
  const search = searchTerm.trim().toLowerCase();

  const togglePool = (name: string) =>
    setExpandedPools((prev) => ({ ...prev, [name]: !prev[name] }));
  //   const map = new Map<string, CourseCode>();
  //   for (const [key, course] of Object.entries(courses)) {
  //     map.set(normalizeCourseCode(key), key);
  //     map.set(normalizeCourseCode(course.id), key);
  //   }
  //   return map;
  // }, [courses]);

  // const resolveCourseKey = (courseId: CourseCode): CourseCode | null => {
  //   if (courses[courseId]) return courseId;
  //   return normalizedCourseKeyMap.get(normalizeCourseCode(courseId)) ?? null;
  // };

  // const isInTimeline = (courseId: CourseCode): boolean => {
  //   const resolvedKey = resolveCourseKey(courseId);
  //   if (!resolvedKey) return false;
  //   const status = courses[resolvedKey]?.status?.status;
  //   return status === "completed" || status === "planned";
  // };

  const formatPoolName = (name: string) => {
    // Modify ECP course pools to retain 'ECP' and format the rest of the name
    if (name.startsWith("ECP_")) {
      return name.replace("ECP_", "ECP ").replace(/_/g, " ");
    }
    return name.charAt(0).toUpperCase() + name.slice(1); // Return the name unchanged for non-ECP course pools
  };

  return (
    <div className="course-pool">
      <div className="course-pool-header">
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
            checked={showIncompleted}
            onChange={(e) => setShowIncompleted(e.target.checked)}
          />
          Incompleted Only
        </label>
      </div>

      <div className="course-pool-list">
        {pools.map((pool, index) => {
          // Filter incomplete courses for this pool based on search
          const visibleCourseIds: CourseCode[] = hasActiveSearch
            ? pool.courses.filter((courseId) => {
                const course = courses[courseId];
                if (!course) return false;
                const code = course.id.toLowerCase();
                const title = course.title.toLowerCase();
                return code.includes(search) || title.includes(search);
              })
            : pool.courses;

          const isExpanded = hasActiveSearch
            ? visibleCourseIds.length > 0 // when searching, auto-expand pools with matches
            : !!expandedPools[pool.name];

          return (
            <div key={`${pool.name}-${index}`} className="pool-section">
              <PoolHeader
                pool={{ ...pool, name: formatPoolName(pool.name) }}
                isExpanded={isExpanded}
                onToggle={() => togglePool(pool.name)}
                courses={courses}
                hasActiveSearch={hasActiveSearch}
              />

              {isExpanded && (
                <PoolCoursesList
                  pool={{ ...pool, name: formatPoolName(pool.name) }}
                  visibleCourseIds={visibleCourseIds}
                  courses={courses}
                  selectedCourse={selectedCourse}
                  onCourseSelect={onCourseSelect}
                  showIncompleted={showIncompleted}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CoursePool;
