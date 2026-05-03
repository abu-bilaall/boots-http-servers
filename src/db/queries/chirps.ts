import { eq } from "drizzle-orm";
import { db } from "../index.js";
import { chirps, type NewChirp } from "../schema.js";

async function createChirp(chirp: NewChirp) {
  const [result] = await db.insert(chirps).values(chirp).onConflictDoNothing().returning();
  return result;
}

async function getAllChirps() {
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

export { createChirp, deleteChirp, getAllChirps, getChirp };
