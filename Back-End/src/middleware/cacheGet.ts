import { Request, Response, NextFunction } from 'express';
import { cacheGet, cacheSet } from '@lib/cache';

export const cacheGET =
  (ttlSeconds = 300) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const key = `GET:${req.originalUrl}`;

    // Sanitize key before logging to prevent log injection (CWE-117)
    const safeKey = key.replaceAll(/[\r\n]/g, '_');

    try {
      const cached = await cacheGet<unknown>(key);
      if (cached) {
        console.log(`CACHE HIT  → ${safeKey}`);
        return res.status(200).json(cached);
      }
      console.log(`CACHE MISS → ${safeKey}`);
    } catch (err) {
      console.warn(`CACHE ERROR → ${safeKey}`, err);
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
