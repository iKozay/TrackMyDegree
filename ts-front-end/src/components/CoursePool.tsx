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

        const isExpanded = hasActiveSearch
          ? visibleCourseIds.length > 0 // when searching, auto-expand pools with matches
          : !!expandedPools[pool.name];

        return (
          <div key={`${pool.name}-${index}`} className="pool-section">
            <PoolHeader
              pool={pool}
              isExpanded={isExpanded}
              onToggle={() => togglePool(pool.name)}
              visibleCourseIds={visibleCourseIds}
              hasActiveSearch={hasActiveSearch}
            />

            {isExpanded && (
              <PoolCoursesList
                pool={pool}
                visibleCourseIds={visibleCourseIds}
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
