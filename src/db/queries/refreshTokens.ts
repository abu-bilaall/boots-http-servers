import { eq } from "drizzle-orm";
import { db } from "../index.js";
import { type NewRefreshToken, refreshTokens } from "../schema.js";

async function createRefreshToken(userId: string, refreshToken: string, tokenExpiry: Date) {
  const [result] = await db
    .insert(refreshTokens)
    .values({ userId: userId, token: refreshToken, expiresAt: tokenExpiry })
    .returning();
  return result;
}

async function getRefreshToken(refreshToken: string) {
  const [result] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.token, refreshToken));
  return result;
}

async function getUserIdFromRefreshToken(refreshToken: string) {
  const [result] = await db
    .select({ userId: refreshTokens.userId })
    .from(refreshTokens)
    .where(eq(refreshTokens.token, refreshToken));
  return result;
}

async function revokeToken(refreshToken: string, revokedAt: Date) {
  const [result] = await db
    .update(refreshTokens)
    .set({ revokedAt: revokedAt })
    .where(eq(refreshTokens.token, refreshToken))
    .returning();
  return result;
}

export { createRefreshToken, getRefreshToken, getUserIdFromRefreshToken, revokeToken };
