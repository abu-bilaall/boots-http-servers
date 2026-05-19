import type { NextFunction, Request, Response } from "express";
import { config } from "./config.js";
import { AppError, InternalServerError } from "./customErrors.js";

type SerializedError = {
  name: string;
  message: string;
  statusCode?: number;
  isOperational?: boolean;
  cause?: unknown;
  stack?: string;
};

function serializeError(err: unknown): SerializedError {
  if (err instanceof InternalServerError) {
    return {
      name: err.name,
      message: err.message,
      statusCode: err.statusCode,
      isOperational: err.isOperational,
      cause: err.cause,
      stack: err.stack,
    };
  }

  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      cause: err.cause,
      stack: err.stack,
    };
  }

  return {
    name: "UnknownError",
    message: String(err),
  };
}

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
  if (err instanceof AppError && err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: { name: err.name, message: err.message, statusCode: err.statusCode },
    });
  }

  console.error(serializeError(err));
  return res.status(500).json({
    success: false,
    error: "Something went wrong on our end",
  });
}

export { middlewareErrorHandling, middlewareLogResponses, middlewareMetricsInc };
