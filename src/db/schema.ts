import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  email: varchar("email", { length: 256 }).unique().notNull(),
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

type NewUser = typeof users.$inferInsert;
type NewChirp = typeof chirps.$inferInsert;

export { chirps, type NewChirp, type NewUser, users };
