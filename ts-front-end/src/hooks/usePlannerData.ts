import { useEffect, useState } from "react";
import type {
  Pool,
  CourseMap,
  SemesterMap,
  TimelineJobResponse,
  JobStatus,
} from "../types/timeline.types";
import mockPlannerResponse from "../mock/plannerResponse.json"; // ⬅️ update path

interface UsePlannerDataResult {
  status: JobStatus;
  pools: Pool[];
  courses: CourseMap;
  semesters: SemesterMap;
}

export function usePlannerData(jobId?: string): UsePlannerDataResult {
  const [status, setStatus] = useState<JobStatus>("processing");
  const [pools, setPools] = useState<Pool[]>([]);
  const [courses, setCourses] = useState<CourseMap>({});
  const [semesters, setSemesters] = useState<SemesterMap>({});

  useEffect(() => {
    let isMounted = true;
    const fetchResult = async () => {
      try {
        // 🔹 For now: use local JSON
        // Later: replace this whole block with a real fetch:
        // const res = await fetch(`/api/planner/${jobId}`);
        // const data: PlannerJobResponse = await res.json();
        const data = mockPlannerResponse as TimelineJobResponse;
        if (!isMounted) return;

        setStatus(data.status);
        if (data.status === "done" && data.result) {
          const { pools, courses, semesters } = data.result;
          setPools(pools);
          setCourses(courses);
          setSemesters(semesters);
          clearInterval(intervalId); // ✅ stop polling once done
        }
      } catch (err) {
        console.error("Error fetching result:", err);
      }
    };
    const intervalId = setInterval(fetchResult, 1000);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [jobId]);

  return {
    status,
    pools,
    courses,
    semesters,
  };
}
