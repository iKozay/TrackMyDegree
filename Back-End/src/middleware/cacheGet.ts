import { Request, Response, NextFunction } from 'express';
import { cacheGet, cacheSet } from '@lib/cache';

export const cacheGET =
  (ttlSeconds = 300) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const key = `GET:${req.originalUrl}`;

    try {
      const cached = await cacheGet<unknown>(key);
      if (cached) {
        console.log(`CACHE HIT  → ${key}`);
        return res.status(200).json(cached);
      }
      console.log(`CACHE MISS → ${key}`);
    } catch (err) {
      console.warn(`CACHE ERROR → ${key}`, err);
    }

    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      // Only cache 2xx responses. 404 does not exist should not be cached.
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheSet(key, body, ttlSeconds).catch(() => {});
      }
      return originalJson(body);
    };

    next();
  };
