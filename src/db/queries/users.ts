import { eq } from "drizzle-orm";
import { db } from "../index.js";
import { type NewUser, users } from "../schema.js";

async function createUser(user: NewUser) {
  const [result] = await db.insert(users).values(user).onConflictDoNothing().returning();
  return result;
}

async function deleteAllUsers() {
  const [result] = await db.delete(users);
  return result;
}

async function getUserWithEmail(email: string) {
  const [result] = await db.select().from(users).where(eq(users.email, email));
  return result;
}

async function updateUser(userId: string, email: string, passwordHash: string) {
  const [result] = await db
    .update(users)
    .set({ hashedPassword: passwordHash, email: email })
    .where(eq(users.id, userId))
    .returning();
  return result;
}

async function makeUserChirpyRed(userId: string) {
  const [result] = await db
    .update(users)
    .set({ isChirpyRed: true })
    .where(eq(users.id, userId))
    .returning();
  return result;
}

export { createUser, deleteAllUsers, getUserWithEmail, makeUserChirpyRed, updateUser };
