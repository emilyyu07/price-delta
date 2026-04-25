/*
Request Validation Middleware: 
- Validates request body against a Zod schema
- Returns 400 error with validation details if validation fails
*/
import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

export const validate =
  <T extends ZodTypeAny>(schema: T) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: result.error.flatten().fieldErrors,
      });
    }

    req.body = result.data;
    return next();
  };
