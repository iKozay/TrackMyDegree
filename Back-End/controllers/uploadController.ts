// controllers/uploadController.ts
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { queue, CourseProcessorJobData } from '../workers/queue';
import type { RequestWithJobId } from '../middleware/assignJobId';

export const uploadController: RequestHandler = async (
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  try {
    const { jobId } = req as RequestWithJobId;
    const file = req.file;
    const body = req.body;

    if (!jobId) {
      res.status(400).json({ message: 'Job ID missing. Did assignJobId run?' });
      return;
    }

    let jobData: CourseProcessorJobData;

    if (file) {
      // file upload route
      jobData = {
        jobId,
        kind: 'file',
        filePath: file.path,
      };
    } else if (body && Object.keys(body).length > 0) {
      // JSON body route
      jobData = {
        jobId,
        kind: 'body',
        body,
      };
    } else {
      res
        .status(400)
        .json({ message: 'No file or body provided in the request' });
      return;
    }

    await queue.add('processData', jobData, {
      removeOnComplete: true,
      removeOnFail: { age: 86400 },
    });

    res.json({
      jobId,
      status: 'processing',
      message: 'Job accepted',
    });
  } catch (err) {
    console.error('Error creating processing job:', err);
    res.status(500).json({ message: 'Error creating job' });
  }
};
