import 'express';

declare module 'express' {
  interface Request {
    params: Record<string, string>; // to have type string for query params instead of string | string[]
  }
}
