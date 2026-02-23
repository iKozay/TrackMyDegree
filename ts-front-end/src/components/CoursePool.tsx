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
    Object.fromEntries(pools.map((p) => [p.name, false]))
  );

  const [searchTerm, setSearchTerm] = useState("");
  const hasActiveSearch = searchTerm.trim().length > 0;
  const search = searchTerm.trim().toLowerCase();

  const togglePool = (name: string) =>
    setExpandedPools((prev) => ({ ...prev, [name]: !prev[name] }));

  const sortCourseIdsByCompletion = (courseIds: CourseCode[]): CourseCode[] =>
    courseIds
      .map((courseId, index) => ({ courseId, index }))
      .sort((a, b) => {
        const aStatus = courses[a.courseId]?.status?.status;
        const bStatus = courses[b.courseId]?.status?.status;
        const statusRank: Record<string, number> = {
          completed: 0,
          planned: 1,
          incomplete: 2,
        };
        const aRank = statusRank[aStatus ?? ""] ?? 3;
        const bRank = statusRank[bStatus ?? ""] ?? 3;

        if (aRank !== bRank) return aRank - bRank;
        return a.index - b.index; // keep existing order within same status
      })
      .map(({ courseId }) => courseId);

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

      {pools.map((pool, index) => {
        // Filter courses for this pool based on search
        const visibleCourseIds: CourseCode[] = hasActiveSearch
          ? pool.courses.filter((courseId) => {
              const course = courses[courseId];
              if (!course) return false;
              const code = course.id.toLowerCase();
              const title = course.title.toLowerCase();
              return code.includes(search) || title.includes(search);
            })
          : pool.courses;
        const sortedVisibleCourseIds = sortCourseIdsByCompletion(visibleCourseIds);

        const isExpanded = hasActiveSearch
          ? sortedVisibleCourseIds.length > 0 // when searching, auto-expand pools with matches
          : !!expandedPools[pool.name];

        return (
          <div key={`${pool.name}-${index}`} className="pool-section">
            <PoolHeader
              pool={{ ...pool, name: formatPoolName(pool.name) }}
              isExpanded={isExpanded}
              onToggle={() => togglePool(pool.name)}
              visibleCourseIds={sortedVisibleCourseIds}
              hasActiveSearch={hasActiveSearch}
            />

            {isExpanded && (
              <PoolCoursesList
                pool={{ ...pool, name: formatPoolName(pool.name) }}
                visibleCourseIds={sortedVisibleCourseIds}
                courses={courses}
                selectedCourse={selectedCourse}
                onCourseSelect={onCourseSelect}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CoursePool;
