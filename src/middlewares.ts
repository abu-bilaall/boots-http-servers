import type { NextFunction, Request, Response } from "express";
import { config } from "./config.js";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "./customErrors.js";

function middlewareLogResponses(req: Request, res: Response, next: NextFunction) {
  res.on("finish", () => {
    if (res.statusCode !== 200) {
      console.log(`[NON-OK] ${req.method} ${req.url} - Status: ${res.statusCode}`);
    }
  });

  next();
}

function middlewareMetricsInc(_req: Request, _res: Response, next: NextFunction) {
  config.api.fileserverHits++;
  next();
}

function middlewareErrorHandling(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof BadRequestError) {
    return res.status(400).json({ error: err.message });
  }

  if (err instanceof UnauthorizedError) {
    return res.status(401).json({ error: err.message });
  }

  if (err instanceof ForbiddenError) {
    return res.status(403).json({ error: err.message });
  }

  if (err instanceof NotFoundError) {
    return res.status(404).json({ error: err.message });
  }

  console.log(err);
  return res.status(500).json({
    error: "Something went wrong on our end",
  });
}

export { middlewareErrorHandling, middlewareLogResponses, middlewareMetricsInc };
