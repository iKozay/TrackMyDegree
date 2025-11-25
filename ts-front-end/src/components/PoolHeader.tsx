import { ChevronDown, ChevronRight } from "lucide-react";
import type { Pool, CourseCode } from "../types/timeline.types";

interface PoolHeaderProps {
  pool: Pool;
  isExpanded: boolean;
  visibleCourseIds: CourseCode[];
  hasActiveSearch: boolean;
  onToggle: () => void;
}

export const PoolHeader: React.FC<PoolHeaderProps> = ({
  pool,
  isExpanded,
  onToggle,
  visibleCourseIds,
  hasActiveSearch,
}) => (
  <button className="pool-header" onClick={onToggle}>
    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
    <span>{pool.name}</span>
    <span className="course-count">
      {hasActiveSearch
        ? `(${visibleCourseIds.length}/${pool.courses.length})`
        : `(${pool.courses.length})`}
    </span>
  </button>
);
