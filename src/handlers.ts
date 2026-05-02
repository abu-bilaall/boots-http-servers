import { readFile } from "node:fs";
import path from "node:path";
import type { NextFunction, Request, Response } from "express";
import {
  checkPasswordHash,
  getBearerToken,
  hashPassword,
  makeJWT,
  makeRefreshToken,
  validateJWT,
} from "./auth/auth.js";
import { config } from "./config.js";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "./customErrors.js";
import { createChirp, getAllChirps, getChirp } from "./db/queries/chirps.js";
import {
  createRefreshToken,
  getRefreshToken,
  getUserIdFromRefreshToken,
  revokeToken,
} from "./db/queries/refreshTokens.js";
import { createUser, deleteAllUsers, getUserWithEmail } from "./db/queries/users.js";
import type { NewChirp, NewUser } from "./db/schema.js";

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

type ChirpBodyPayload = { body: string };
function cleanChirp(parsedBody: ChirpBodyPayload) {
  const profane = ["kerfuffle", "sharbert", "fornax"];

  if (parsedBody.body.length > 140) {
    throw new BadRequestError("Chirp is too long. Max length is 140");
  }

  const regex = new RegExp(`\\b(${profane.join("|")})\\b`, "gi");

  const cleanedBody = parsedBody.body.replace(regex, "****");
  return cleanedBody;
}

async function handlerCreateChirp(req: Request, res: Response, next: NextFunction) {
  try {
    const jwt = getBearerToken(req);
    const userId = validateJWT(jwt, config.api.secret);
    const body = cleanChirp(req.body);
    const payload: NewChirp = { body, userId };
    const newChirp = await createChirp(payload);
    return res.status(201).json(newChirp);
  } catch (error) {
    next(error);
  }
}

async function handlerGetAllChirps(_req: Request, res: Response, next: NextFunction) {
  try {
    const chirps = await getAllChirps();
    return res.status(200).json(chirps);
  } catch (error) {
    next(error);
  }
}

async function handlerGetChirp(req: Request, res: Response, next: NextFunction) {
  try {
    const chirpDetails = await getChirp(req.params.chirpId as string);
    if (chirpDetails) {
      return res.status(200).json(chirpDetails);
    }
    throw new NotFoundError("Invalid ID. Chirp not found.");
  } catch (error) {
    next(error);
  }
}

type UserPayload = { email: string; password: string; expiresInSeconds?: number };
type UserResponse = Omit<NewUser, "hashedPassword">;
async function handlerUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const reqBody: UserPayload = req.body;
    const passwordHash = await hashPassword(reqBody.password);
    const newUser = { email: reqBody.email, hashedPassword: passwordHash };
    const { email, id, ...newUserDetails }: UserResponse = await createUser(newUser);
    return res.status(201).json({ email, id, newUserDetails });
  } catch (error) {
    next(error);
  }
}

async function handlerDeleteUsers(_req: Request, res: Response, next: NextFunction) {
  try {
    if (config.api.platform !== "dev") throw new ForbiddenError("Environment is not 'dev.'");
    await deleteAllUsers();
    return res.status(200).json({ message: "all users deleted" });
  } catch (error) {
    next(error);
  }
}

async function handlerLoginUser(req: Request, res: Response, next: NextFunction) {
  try {
    const reqBody: UserPayload = req.body;
    const user: NewUser = await getUserWithEmail(reqBody.email);
    if (await checkPasswordHash(reqBody.password, user.hashedPassword as string)) {
      const { email, id, ...userDetails }: UserResponse = user;
      const exp = 3600;
      const token = makeJWT(id as string, exp, config.api.secret);
      const refreshToken = makeRefreshToken();
      const days = parseInt(config.api.refreshTokenExpiry, 10); // "60d" -> 60
      const refreshTokenExpiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      await createRefreshToken(id as string, refreshToken, refreshTokenExpiry);
      return res.status(200).json({ email, id, token, refreshToken, userDetails });
    }
    throw new UnauthorizedError("incorrect email or password");
  } catch (error) {
    next(error);
  }
}

async function handlerRefresh(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = getBearerToken(req);
    const tokenDetails = await getRefreshToken(refreshToken);
    const { userId } = await getUserIdFromRefreshToken(refreshToken);
    if (tokenDetails && tokenDetails.revokedAt !== null) {
      throw new UnauthorizedError("Refresh token has been revoked");
    }

    const exp = 3600;
    const jwt = makeJWT(userId, exp, config.api.secret);
    return res.status(200).json({ token: jwt });
  } catch (error) {
    next(error);
  }
}

async function handlerRevoke(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = getBearerToken(req);
    await revokeToken(refreshToken, new Date());
    return res.status(204).end();
  } catch (error) {
    next(error);
  }
}

export {
  handlerCreateChirp,
  handlerDeleteUsers,
  handlerGetAllChirps,
  handlerGetChirp,
  handlerLoginUser,
  handlerMetrics,
  handlerReadiness,
  handlerRefresh,
  handlerReset,
  handlerRevoke,
  handlerUsers,
};
