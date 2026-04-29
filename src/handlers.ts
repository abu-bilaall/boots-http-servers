import { readFile } from "node:fs";
import path from "node:path";
import type { Request, Response } from "express";
import { config } from "./config.js";

function handlerReadiness(_req: Request, res: Response) {
  res.set("Content-Type", "text/plain");
  res.set("charset", "utf-8");
  res.send("OK");
}

function handlerMetrics(_req: Request, res: Response) {
  const filePath = path.join(process.cwd(), "src", "admin", "index.html");
  readFile(filePath, "utf-8", (err, data) => {
    if (err) return res.sendStatus(500);
    res.set({
      "Content-Type": "text/html",
      charset: "utf-8",
    });
    res.send(data.replace("NUM", String(config.fileserverHits)));
  });
}

function handlerReset(_req: Request, res: Response) {
  config.fileserverHits = 0;
  res.set({
    "Content-Type": "text/plain",
    charset: "utf-8",
  });

  res.send(`Hits have been reset`);
}

export { handlerMetrics, handlerReadiness, handlerReset };
