// controllers/resultController.ts
import type { RequestHandler } from 'express';
import { cacheJobResult, getJobResult } from '../lib/cache';
interface GetResultParams {
  jobId: string;
}

export interface CachedJobResult<T = unknown> {
  payload: {
    status: string;
    data: T;
  };
}

export const getByJobId: RequestHandler<GetResultParams> = async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(404).json({ message: 'Job not passed' });
    }
    // get result from cache
    const cached = await getJobResult<CachedJobResult>(jobId);

    if (!cached) {
      return res.status(410).json({ error: 'result expired' });
    }

    return res.json({
      jobId,
      status: cached.payload.status,
      result: cached.payload.data,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error fetching result' });
  }
};
type CachedTimeline = {
  pools: {
    _id: string;
    courses: string[];
  }[];

  courses: Record<string, Record<string, unknown>>;

  semesters: unknown[];
  timelineName?: string;
};
type TimelinePartialUpdate = {
  exemptions?: string[];
  deficiencies?: string[];
  courses?: Record<string, Record<string, unknown>>;
  semesters?: unknown[];
  timelineName?: string;
};
function updatePool(
  timeline: CachedTimeline,
  poolId: string,
  courses?: string[],
) {
  if (!courses) return;

  const pool = timeline.pools.find((p) => p._id === poolId);
  if (pool) {
    pool.courses = courses;
  }
}

function updateCourses(
  timeline: CachedTimeline,
  courses?: Record<string, Record<string, unknown>>,
) {
  if (!courses) return;

  for (const courseId of Object.keys(courses)) {
    if (timeline.courses[courseId]) {
      timeline.courses[courseId] = {
        ...timeline.courses[courseId],
        ...courses[courseId],
      };
    }
  }
}

export const cacheTimelineByJobId: RequestHandler<GetResultParams> = async (
  req,
  res,
) => {
  try {
    const { jobId } = req.params;
    const partialUpdate = req.body as TimelinePartialUpdate;

    if (!jobId) {
      return res.status(404).json({ message: 'Job ID not provided' });
    }

    // IMPORTANT: generic is the DATA type, not CachedJobResult
    const cached = await getJobResult<CachedTimeline>(jobId);

    if (!cached || !cached.payload?.data) {
      return res.status(404).json({ message: 'Timeline not found' });
    }

    const timeline = cached.payload.data;

    // ---- Apply partial updates (low complexity) ----
    updatePool(timeline, 'exemptions', partialUpdate.exemptions);
    updatePool(timeline, 'deficiencies', partialUpdate.deficiencies);
    updateCourses(timeline, partialUpdate.courses);

    if (partialUpdate.semesters) {
      timeline.semesters = partialUpdate.semesters;
    }

    // handle timelineName update
    if (partialUpdate.timelineName !== undefined) {
        timeline.timelineName = partialUpdate.timelineName;
    }

    await cacheJobResult(jobId, {
      payload: {
        status: 'done',
        data: timeline,
      },
    });

    return res.json({ message: 'Timeline updated successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error caching timeline' });
  }
};
