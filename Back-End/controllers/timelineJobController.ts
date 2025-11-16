// controllers/resultController.ts
import type { RequestHandler } from "express";
import { getJobResult } from "../lib/cache";

interface GetResultParams {
  jobId: string;
}

interface CachedJobResult<T = unknown> {
  payload: {
    status: string;
    data: T;
  };
}

export const getTimelineByJobId: RequestHandler<GetResultParams> = async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(404).json({ message: "Job not passed" });
    }

    // get result from cache
    const cached = await getJobResult<CachedJobResult>(jobId);

    if (!cached) {
      return res.status(410).json({ error: "result expired" });
    }

    return res.json({
      jobId,
      status: cached.payload.status,
      result: cached.payload.data,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error fetching result" });
  }
};
