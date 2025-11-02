import type { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error('[ERROR]', err);
  const status = err?.status || 500;
  const message = err?.message || 'internal_error';
  res.status(status).json({ error: message });
}
