// middleware/assignJobId.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { randomUUID } from "crypto";

export interface RequestWithJobId extends Request {
  jobId?: string;
}

// Type it explicitly as an Express RequestHandler
export const assignJobId: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  (req as RequestWithJobId).jobId = randomUUID();
  next();
};
