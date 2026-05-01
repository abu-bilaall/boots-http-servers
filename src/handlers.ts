import { readFile } from "node:fs";
import path from "node:path";
import type { NextFunction, Request, Response } from "express";
import { config } from "./config.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "./customErrors.js";
import { createChirp, getAllChirps, getChirp } from "./db/queries/chirps.js";
import { createUser, deleteAllUsers } from "./db/queries/users.js";
import type { NewChirp } from "./db/schema.js";

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
      res.send(data.replace("NUM", String(config.api.fileserverHits)));
    });
  } catch (error) {
    next(error);
  }
}

function handlerReset(_req: Request, res: Response) {
  config.api.fileserverHits = 0;
  res.set({
    "Content-Type": "text/plain",
    charset: "utf-8",
  });

  res.send(`Hits have been reset`);
}

type ChirpBodyPayload = { body: string; userId: string };
function cleanChirp(parsedBody: ChirpBodyPayload) {
  const profane = ["kerfuffle", "sharbert", "fornax"];

  if (parsedBody.body.length > 140) {
    throw new BadRequestError("Chirp is too long. Max length is 140");
  }

  const regex = new RegExp(`\\b(${profane.join("|")})\\b`, "gi");

  const cleanedBody = parsedBody.body.replace(regex, "****");
  return { body: cleanedBody, userId: parsedBody.userId };
}

async function handlerCreateChirp(req: Request, res: Response, next: NextFunction) {
  try {
    const payload: NewChirp = cleanChirp(req.body);
    const newChirp = await createChirp(payload);
    res.status(201).json(newChirp);
  } catch (error) {
    next(error);
  }
}

async function handlerGetAllChirps(_req: Request, res: Response, next: NextFunction) {
  try {
    const chirps = await getAllChirps();
    res.status(200).json(chirps);
  } catch (error) {
    next(error);
  }
}

async function handlerGetChirp(req: Request, res: Response, next: NextFunction) {
  try {
    const chirpDetails = await getChirp(req.params.chirpId as string);
    if (chirpDetails) {
      res.status(200).json(chirpDetails);
    } else {
      throw new NotFoundError("Invalid ID. Chirp not found.");
    }
  } catch (error) {
    next(error);
  }
}

async function handlerUsers(req: Request, res: Response, next: NextFunction) {
  type BodyPayload = { email: string };

  try {
    const reqBody: BodyPayload = req.body;
    const newUser = { email: reqBody.email };
    const { email, id, ...newUserDetails } = await createUser(newUser);
    return res.status(201).json({ email, id, newUserDetails });
  } catch (error) {
    next(error);
  }
}

async function handlerDeleteUsers(_req: Request, res: Response, next: NextFunction) {
  try {
    if (config.api.platform !== "dev") throw new ForbiddenError("Environment is not 'dev.'");
    await deleteAllUsers();
    res.status(200).json({ message: "all users deleted" });
  } catch (error) {
    next(error);
  }
}

export {
  handlerCreateChirp,
  handlerDeleteUsers,
  handlerGetAllChirps,
  handlerGetChirp,
  handlerMetrics,
  handlerReadiness,
  handlerReset,
  handlerUsers,
};
