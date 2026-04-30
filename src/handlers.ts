import { readFile } from "node:fs";
import path from "node:path";
import type { NextFunction, Request, Response } from "express";
import { config } from "./config.js";
import { BadRequestError } from "./customErrors.js";

function handlerReadiness(_req: Request, res: Response) {
  res.set("Content-Type", "text/plain");
  res.set("charset", "utf-8");
  res.send("OK");
}

function handlerMetrics(_req: Request, res: Response, next: NextFunction) {
  const filePath = path.join(process.cwd(), "src", "admin", "index.html");
  try {
    readFile(filePath, "utf-8", (err, data) => {
      if (err) return res.sendStatus(500);
      res.set({
        "Content-Type": "text/html",
        charset: "utf-8",
      });
      res.send(data.replace("NUM", String(config.fileserverHits)));
    });
  } catch (error) {
    next(error);
  }
}

function handlerReset(_req: Request, res: Response) {
  config.fileserverHits = 0;
  res.set({
    "Content-Type": "text/plain",
    charset: "utf-8",
  });

  res.send(`Hits have been reset`);
}

function handlerValidateChirp(req: Request, res: Response, next: NextFunction) {
  type BodyPayload = { body: string };
  const profane = ["kerfuffle", "sharbert", "fornax"];

  try {
    const parsedBody: BodyPayload = req.body;

    if (parsedBody.body.length > 140) {
      // return res.status(400).json({ error: "Chirp is too long" });
      throw new BadRequestError("Chirp is too long. Max length is 140");
    }

    // Build regex like: /\b(kerfuffle|sharbert|fornax)\b/gi
    const regex = new RegExp(`\\b(${profane.join("|")})\\b`, "gi");

    const cleanedBody = parsedBody.body.replace(regex, "****");

    return res.status(200).json({
      cleanedBody,
    });
  } catch (error) {
    next(error);
  }
}

export { handlerMetrics, handlerReadiness, handlerReset, handlerValidateChirp };
