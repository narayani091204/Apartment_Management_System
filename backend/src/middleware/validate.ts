import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodSchema } from 'zod';
import { ApiError } from '../utils/ApiError.js';

type Source = 'body' | 'query' | 'params';

/* Validates a request segment against a Zod schema and replaces it with the
 * parsed (coerced) result. Throws a 400 ApiError with field details on failure. */
export function validate(schema: ZodSchema, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[source]);
      // query/params are read-only getters in Express 5; assign defensively.
      (req as unknown as Record<Source, unknown>)[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        throw ApiError.badRequest(
          'Validation failed',
          err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        );
      }
      throw err;
    }
  };
}
