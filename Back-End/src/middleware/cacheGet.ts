import { Request, Response, NextFunction } from 'express';
import { cacheGet, cacheSet } from '@lib/cache';

export const cacheGET =
  (ttlSeconds = 300) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const key = `GET:${req.originalUrl}`;

    try {
      const cached = await cacheGet<unknown>(key);
      if (cached) return res.status(200).json(cached);
    } catch {
      // If Redis is down, do not block the request
    }

    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      cacheSet(key, body, ttlSeconds).catch(() => {});
      return originalJson(body);
    };

    next();
  };
