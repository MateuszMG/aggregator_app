import { NextFunction, Request, Response } from 'express';
import { logger } from '../middleware/logger';

export class HttpError extends Error {
  public status: number;
  public details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export class ValidationError extends HttpError {
  constructor(details: unknown) {
    super(400, 'Validation Error', details);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Not Found') {
    super(404, message);
  }
}

export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (!err.logged && !(err instanceof HttpError)) {
    logger.error({ err: err instanceof Error ? err.message : String(err) });
  }

  if (err instanceof ValidationError) {
    return res.status(400).json({ errors: err.details });
  }

  if (err instanceof NotFoundError) {
    return res.status(404).json({ error: err.message });
  }

  res.status(500).json({ error: 'Internal Server Error' });
};
