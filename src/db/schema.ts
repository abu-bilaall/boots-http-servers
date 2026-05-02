import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  email: varchar("email", { length: 256 }).unique().notNull(),
  hashedPassword: varchar("hashed_password", { length: 255 }).notNull().default("unset"),
});

const chirps = pgTable("chirps", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updateAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  body: text("body").notNull(),
});

const refreshTokens = pgTable("refresh_tokens", {
  token: text("token").primaryKey().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  upatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
});

type NewUser = typeof users.$inferInsert;
type NewChirp = typeof chirps.$inferInsert;
type NewRefreshToken = typeof refreshTokens.$inferInsert;

export { chirps, type NewChirp, type NewRefreshToken, type NewUser, refreshTokens, users };
