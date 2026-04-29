import type { NextFunction, Request, Response } from "express";
import { config } from "./config.js";

function middlewareLogResponses(req: Request, res: Response, next: NextFunction) {
  res.on("finish", () => {
    if (res.statusCode !== 200) {
      console.log(`[NON-OK] ${req.method} ${req.url} - Status: ${res.statusCode}`);
    }
  });

  next();
}

function middlewareMetricsInc(_req: Request, _res: Response, next: NextFunction) {
  config.fileserverHits++;
  next();
}

export { middlewareLogResponses, middlewareMetricsInc };
