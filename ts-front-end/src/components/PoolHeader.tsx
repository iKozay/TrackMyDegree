import { ChevronDown, ChevronRight } from "lucide-react";
import type { Pool, CourseCode } from "../types/timeline.types";

interface PoolHeaderProps {
  pool: Pool;
  isExpanded: boolean;
  visibleCourseIds: CourseCode[];
  disabled?: boolean;
  onToggle: () => void;
}

export const PoolHeader: React.FC<PoolHeaderProps> = ({
  pool,
  isExpanded,
  onToggle,
  visibleCourseIds,
  disabled = false,
}) => (
  <button
    className={`pool-header${disabled ? " pool-header-disabled" : ""}`}
    onClick={onToggle}
    disabled={disabled}
    aria-disabled={disabled}
  >
    <span className="pool-chevron">
      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
    </span>

    <span className="pool-name">{pool.name}</span>

    <span className="course-count">{`(${visibleCourseIds.length})`}</span>
  </button>
);
