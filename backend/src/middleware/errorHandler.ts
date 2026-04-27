/*
Global error handling middleware:
- Catches errors thrown in route handlers and other middleware
- Logs error details to the console for debugging
- Sends a JSON response with error message and stack trace (in development)
*/

import type { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  console.error("Backend error:", err.message);

  //send JSON error that frontend can understand
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};
