import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import express from "express";

import postgres from "postgres";
import { config } from "./config.js";

import {
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
} from "./handlers.js";

import {
  middlewareErrorHandling,
  middlewareLogResponses,
  middlewareMetricsInc,
} from "./middlewares.js";

process.loadEnvFile();
const migrationClient = postgres(config.db.url, { max: 1 });
await migrate(drizzle(migrationClient), config.db.migrationConfig);

const app = express();
const PORT = 8080;

app.use(middlewareLogResponses);
app.use(express.json());

app.use("/app", middlewareMetricsInc, express.static("./src/app"));

app.get("/api/healthz", handlerReadiness);
app.get("/api/chirps", handlerGetAllChirps);
app.get("/api/chirps/:chirpId", handlerGetChirp);
app.post("/api/chirps", handlerCreateChirp);
app.post("/api/users", handlerUsers);
app.post("/api/login", handlerLoginUser);
app.post("/api/refresh", handlerRefresh);
app.post("/api/revoke", handlerRevoke);

app.use("/admin/metrics", handlerMetrics);
app.post("/admin/reset", handlerDeleteUsers, handlerReset);

app.use(middlewareErrorHandling);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
