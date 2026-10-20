import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";

export function notFound(req: Request, res: Response) {
  res.status(404).json({ success: false, error: { message: `Route not found: ${req.method} ${req.originalUrl}` } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ success: false, error: { message: "Invalid JSON body" } });
    return;
  }
  if (err?.type === "entity.too.large") {
    res.status(413).json({ success: false, error: { message: "Request body too large" } });
    return;
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const fields: Record<string, string> = {};
    for (const [key, e] of Object.entries(err.errors)) fields[key] = e.message;
    res.status(400).json({ success: false, error: { message: "Validation failed", fields } });
    return;
  }
  console.error(err);
  res.status(500).json({ success: false, error: { message: "Internal server error" } });
}