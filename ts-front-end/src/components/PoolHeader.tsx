import { ChevronDown, ChevronRight } from "lucide-react";
import type { Pool, CourseMap } from "../types/timeline.types";
import { calculateCoursePoolEarnedCredits } from "../utils/timelineUtils";

interface PoolHeaderProps {
  pool: Pool;
  isExpanded: boolean;
  courses: CourseMap;
  hasActiveSearch: boolean;
  onToggle: () => void;
}

export const PoolHeader: React.FC<PoolHeaderProps> = ({
  pool,
  isExpanded,
  onToggle,
  courses,
  hasActiveSearch,
}) => (
  <button className="pool-header" onClick={onToggle}>
    <span className="pool-chevron">
      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
    </span>

    <span className="pool-name">{pool.name}</span>
    <span className="course-count">
      {!hasActiveSearch
        ? `(${calculateCoursePoolEarnedCredits(courses, pool)}/${pool.creditsRequired})`
        : `(${pool.courses.length})`}
    </span>
  </button>
);
