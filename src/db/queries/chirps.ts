import { desc, eq } from "drizzle-orm";
import { db } from "../index.js";
import { chirps, type NewChirp } from "../schema.js";

async function createChirp(chirp: NewChirp) {
  const [result] = await db.insert(chirps).values(chirp).onConflictDoNothing().returning();
  return result;
}

async function getAllChirps(descOrder?: boolean) {
  if (descOrder) {
    return await db.select().from(chirps).orderBy(desc(chirps.createdAt));
  }

  const result = await db.select().from(chirps).orderBy(chirps.createdAt);
  return result;
}

async function getChirp(id: string) {
  const [result] = await db.select().from(chirps).where(eq(chirps.id, id));
  return result;
}

async function deleteChirp(id: string) {
  await db.delete(chirps).where(eq(chirps.id, id)).returning();
  return;
}

async function getChirpsWithUserId(userId: string) {
  const result = await db
    .select()
    .from(chirps)
    .where(eq(chirps.userId, userId))
    .orderBy(chirps.createdAt);
  return result;
}

export { createChirp, deleteChirp, getAllChirps, getChirp, getChirpsWithUserId };
