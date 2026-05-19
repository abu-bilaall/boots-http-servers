import { randomBytes } from "node:crypto";
import * as argon2 from "argon2";
import type { Request } from "express";
import type { JwtPayload } from "jsonwebtoken";
import jwt, { JsonWebTokenError, NotBeforeError, TokenExpiredError } from "jsonwebtoken";
import { InternalServerError, UnauthorizedError } from "../customErrors.js";

type Payload = Pick<JwtPayload, "iss" | "sub" | "iat" | "exp">;

function hashPassword(password: string): Promise<string> {
  try {
    const hash = argon2.hash(password);
    return hash;
  } catch (error) {
    throw new InternalServerError(`Error hashing password`, error);
  }
}

async function checkPasswordHash(password: string, hash: string): Promise<boolean> {
  try {
    return argon2.verify(hash, password);
  } catch (error) {
    throw new InternalServerError(`Error verifying password hash`, error);
  }
}

function makeJWT(userID: string, expiresIn: number, secret: string): string {
  const iat = Math.floor(Date.now() / 1000);
  const payload: Payload = { iss: "chirpy", sub: userID, iat, exp: iat + expiresIn };
  return jwt.sign(payload, secret);
}

function validateJWT(tokenString: string, secret: string): string {
  try {
    const decodedToken = jwt.verify(tokenString, secret);
    return decodedToken.sub as string;
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new UnauthorizedError("Token has expired", error);
    }

    if (error instanceof NotBeforeError) {
      throw new UnauthorizedError("Token not yet valid", error)
    }

    if (error instanceof JsonWebTokenError) {
      // covers: invalid signature, malformed token, wrong algorithm, etc.
      throw new UnauthorizedError("Invalid token", error);
    }

    // anything else (e.g. secret is undefined, internal library fault)
    throw new InternalServerError(`Error validating JWT`, error);
  }
}

function getBearerToken(req: Request): string {
  const authHeader = req.get("Authorization");

  if (!authHeader) {
    throw new UnauthorizedError("Authorization header missing");
  }

  if (!authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Invalid auth format");
  }

  return authHeader.slice(7); // remove "Bearer "
}

function makeRefreshToken() {
  const buf = randomBytes(256);
  return buf.toString("hex");
}

function getAPIKey(req: Request) {
  const authHeader = req.get("Authorization");

  if (!authHeader) {
    throw new UnauthorizedError("Authorization header missing");
  }

  if (!authHeader.startsWith("ApiKey ")) {
    throw new UnauthorizedError("Invalid auth format");
  }

  return authHeader.slice(7); // remove ApiKey
}

export {
  checkPasswordHash,
  getAPIKey,
  getBearerToken,
  hashPassword,
  makeJWT,
  makeRefreshToken,
  validateJWT,
};
