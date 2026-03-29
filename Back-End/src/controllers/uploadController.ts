// controllers/uploadController.ts
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { queue, CourseProcessorJobData } from '../workers/queue';
import type { RequestWithJobId } from '../middleware/assignJobId';
import { BadRequestError } from '@utils/errors';

export const uploadController: RequestHandler = async (
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> => {
    const { jobId } = req as RequestWithJobId;
    const file = req.file;
    const body = req.body;

    if (!jobId) {
      throw new BadRequestError('Job ID is missing from the request');
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
      throw new BadRequestError('No file or body data provided for upload');
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
};
