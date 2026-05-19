import { readFile } from "node:fs";
import path from "node:path";
import type { NextFunction, Request, Response } from "express";
import {
  checkPasswordHash,
  getAPIKey,
  getBearerToken,
  hashPassword,
  makeJWT,
  makeRefreshToken,
  validateJWT,
} from "./auth/auth.js";
import { config } from "./config.js";
import {
  AppError,
  BadRequestError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from "./customErrors.js";
import {
  createChirp,
  deleteChirp,
  getAllChirps,
  getChirp,
  getChirpsWithUserId,
} from "./db/queries/chirps.js";
import {
  createRefreshToken,
  getRefreshToken,
  getUserIdFromRefreshToken,
  revokeToken,
} from "./db/queries/refreshTokens.js";
import {
  createUser,
  deleteAllUsers,
  getUserWithEmail,
  makeUserChirpyRed,
  updateUser,
} from "./db/queries/users.js";
import type { NewChirp, NewUser } from "./db/schema.js";

function handlerReadiness(_req: Request, res: Response) {
  res.set("Content-Type", "text/plain");
  res.set("charset", "utf-8");
  res.send("OK");
}

function handlerMetrics(_req: Request, res: Response, next: NextFunction) {
  const filePath = path.join(process.cwd(), "src", "admin", "index.html");
    readFile(filePath, "utf-8", (err, data) => {
      if (err) return next(new InternalServerError(`Error reading ${filePath}`, err));
      res.set({
        "Content-Type": "text/html",
        charset: "utf-8",
      });
      res.send(data.replace("NUM", String(config.api.fileserverHits)));
    });
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
    if (error instanceof AppError) return next(error);
    next(new InternalServerError(`Error creating new chirp, request body: ${req.body}`, error));
  }
}

async function handlerGetAllChirps(req: Request, res: Response, next: NextFunction) {
  try {
    const authorId = req.query.authorId;
    if (typeof authorId === "string") {
      const authorChirps = await getChirpsWithUserId(authorId);
      return res.status(200).json(authorChirps);
    }

    const sortOrder = req.query.sort;
    if (typeof sortOrder === "string" && sortOrder === "desc") {
      const chirpsInDescOrder = await getAllChirps(true);
      return res.status(200).json(chirpsInDescOrder);
    }
    const chirps = await getAllChirps();
    return res.status(200).json(chirps);
  } catch (error) {
    next(new InternalServerError("Error getting all chirps", error));
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
    if (error instanceof AppError) return next(error);
    next(
      new InternalServerError(
        `Error getting chirp, chirp id: ${req.params.chirpId as string}`,
        error
      )
    );
  }
}

async function handlerDeleteChirp(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = validateJWT(getBearerToken(req), config.api.secret);
    const chirpId = req.params.chirpId as string;
    const chirpDetails = await getChirp(chirpId);

    if (!chirpDetails) {
      throw new NotFoundError("Chirp not found.");
    }

    if (chirpDetails.userId !== userId) {
      throw new ForbiddenError("Forbidden Error. Chirp isn't yours.");
    }

    await deleteChirp(chirpId);
    return res.status(204).end();
  } catch (error) {
    if (error instanceof AppError) return next(error);

    next(
      new InternalServerError(
        `Error deleting chirp, chirp id: ${req.params.chirpId as string}`,
        error
      )
    );
  }
}

type UserPayload = { email: string; password: string };
type UserResponse = Omit<NewUser, "hashedPassword">;
async function handlerUsers(req: Request, res: Response, next: NextFunction) {
  const reqBody: UserPayload = req.body;
  try {
    const passwordHash = await hashPassword(reqBody.password);
    const newUser = { email: reqBody.email, hashedPassword: passwordHash };
    const { email, id, ...newUserDetails }: UserResponse = await createUser(newUser);
    return res.status(201).json({
      email,
      id,
      isChirpyRed: newUserDetails.isChirpyRed,
      createdAt: newUserDetails.createdAt,
      updatedAt: newUserDetails.updatedAt,
    });
  } catch (error) {
    next(new InternalServerError(`Error creating user: ${reqBody.email}`, error));
  }
}

async function handlerDeleteUsers(_req: Request, res: Response, next: NextFunction) {
  try {
    if (config.api.platform !== "dev") throw new ForbiddenError("Environment is not 'dev.'");
    await deleteAllUsers();
    return res.status(200).json({ message: "all users deleted" });
  } catch (error) {
    if (error instanceof AppError) return next(error);
    next(new InternalServerError("Error deleting all users", error));
  }
}

async function handlerLoginUser(req: Request, res: Response, next: NextFunction) {
  try {
    const reqBody: UserPayload = req.body;
    const user: NewUser = await getUserWithEmail(reqBody.email);
    
    if (!user) throw new UnauthorizedError("Incorrect email or password");

    if (await checkPasswordHash(reqBody.password, user.hashedPassword as string)) {
      const { email, id, ...userDetails }: UserResponse = user;
      const exp = 3600;
      const token = makeJWT(id as string, exp, config.api.secret);
      const refreshToken = makeRefreshToken();
      const days = parseInt(config.api.refreshTokenExpiry, 10); // "60d" -> 60
      const refreshTokenExpiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      await createRefreshToken(id as string, refreshToken, refreshTokenExpiry);
      return res.status(200).json({
        email,
        id,
        token,
        refreshToken,
        isChirpyRed: userDetails.isChirpyRed,
        createdAt: userDetails.createdAt,
        updatedAt: userDetails.updatedAt,
      });
    }
    throw new UnauthorizedError("Incorrect email or password");
  } catch (error) {
    if (error instanceof AppError) return next(error);
    next(new InternalServerError(`Error logging user in: ${req.body.email}`, error));
  }
}

async function handlerUpdateUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = validateJWT(getBearerToken(req), config.api.secret);
    const { password, email }: UserPayload = req.body;
    const passwordHash = await hashPassword(password);
    const { id, createdAt, updatedAt, isChirpyRed }: UserResponse = await updateUser(
      userId,
      email,
      passwordHash
    );
    return res.status(200).json({ id, email, isChirpyRed, createdAt, updatedAt });
  } catch (error) {
    if (error instanceof AppError) return next(error);
    next(new InternalServerError(`Error updating user: ${req.body.email}`, error));
  }
}

async function handlerRefresh(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = getBearerToken(req);
    const tokenDetails = await getRefreshToken(refreshToken);

    if (!tokenDetails) throw new UnauthorizedError("Refresh token not found");
    if (tokenDetails.revokedAt !== null) throw new UnauthorizedError("Refresh token has been revoked");
    if (tokenDetails.expiresAt < new Date()) throw new UnauthorizedError("Refresh token has expired");

    const exp = 3600;
    const jwt = makeJWT(tokenDetails.userId, exp, config.api.secret);
    return res.status(200).json({ token: jwt });
  } catch (error) {
    if (error instanceof AppError) return next(error);
    next(new InternalServerError("Error refreshing JWT", error));
  }
}

async function handlerRevoke(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = getBearerToken(req);
    await revokeToken(refreshToken, new Date());
    return res.status(204).end();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    next(new InternalServerError("Error revoking refresh token", error));
  }
}

async function handlerPolkaWebhooks(req: Request, res: Response, next: NextFunction) {
  try {
    type PolkaHook = { event: string; data: { userId: string } };

    const apiKey = getAPIKey(req);
    if (apiKey !== config.api.polkaKey) {
      throw new UnauthorizedError("Unauthorized API Key.");
    }

    const hook: PolkaHook = req.body;
    if (hook.event !== "user.upgraded") {
      return res.status(204).end();
    }

    const userDetails = await makeUserChirpyRed(hook.data.userId);
    if (!userDetails) {
      throw new NotFoundError("user not found");
    }

    return res.status(204).end();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    next(new InternalServerError("Error upgrading user to a Chirpy Red member", error));
  }
}

export {
  handlerCreateChirp,
  handlerDeleteChirp,
  handlerDeleteUsers,
  handlerGetAllChirps,
  handlerGetChirp,
  handlerLoginUser,
  handlerMetrics,
  handlerPolkaWebhooks,
  handlerReadiness,
  handlerRefresh,
  handlerReset,
  handlerRevoke,
  handlerUpdateUsers,
  handlerUsers,
};
