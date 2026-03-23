import { ChevronDown, ChevronRight } from "lucide-react";
import type { CourseMap } from "../types/timeline.types";
import { calculateCoursePoolEarnedCredits } from "../utils/timelineUtils";
import { type CoursePoolData } from "@trackmydegree/shared";

interface PoolHeaderProps {
  pool: CoursePoolData;
  isExpanded: boolean;
  courses: CourseMap;
  disabled?: boolean;
  onToggle: () => void;
}

export const PoolHeader: React.FC<PoolHeaderProps> = ({
  pool,
  isExpanded,
  onToggle,
  courses,
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

    <span className="course-count">{`(${calculateCoursePoolEarnedCredits(courses, pool)}/${pool.creditsRequired})`}</span>
  </button>
);
