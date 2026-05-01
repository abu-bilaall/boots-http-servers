import type { MigrationConfig } from "drizzle-orm/migrator";

process.loadEnvFile();

function envOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is missing in .env`);
  }
  return value;
}

const dbUrl = envOrThrow("DB_URL");
const platform = envOrThrow("PLATFORM");

type APIConfig = {
  api: {
    fileserverHits: number;
    platform: string;
  };
};

type DBConfig = {
  db: {
    url: string;
    migrationConfig: MigrationConfig;
  };
};

const migrationConfig: MigrationConfig = {
  migrationsFolder: "./src/db/migrations",
};

export const config: DBConfig & APIConfig = {
  db: {
    url: dbUrl,
    migrationConfig,
  },
  api: {
    fileserverHits: 0,
    platform: platform,
  },
};
