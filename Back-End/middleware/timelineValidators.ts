import { Request, Response, NextFunction } from 'express';
import HTTP from '@Util/HTTPCodes';

export const validateTimelineBody = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { timeline } = req.body;
  if (!timeline || Object.keys(timeline).length === 0) {
    return res
      .status(HTTP.BAD_REQUEST)
      .json({ error: 'Timeline data is required' });
  }
  next();
};

export const validateUserId = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { userId } = req.params;
  if (!userId)
    return res.status(HTTP.BAD_REQUEST).json({ error: 'User ID is required' });
  next();
};

export const validateTimelineId = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { timelineId } = req.params;
  if (!timelineId)
    return res
      .status(HTTP.BAD_REQUEST)
      .json({ error: 'Timeline ID is required' });
  next();
};
