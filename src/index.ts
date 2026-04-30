import express from "express";
import {
  handlerMetrics,
  handlerReadiness,
  handlerReset,
  handlerValidateChirp,
} from "./handlers.js";
import {
  middlewareErrorHandling,
  middlewareLogResponses,
  middlewareMetricsInc,
} from "./middlewares.js";

const app = express();
const PORT = 8080;

app.use(middlewareLogResponses);
app.use(express.json());

app.use("/app", middlewareMetricsInc, express.static("./src/app"));

app.get("/api/healthz", handlerReadiness);
app.post("/api/validate_chirp", handlerValidateChirp);

app.use("/admin/metrics", handlerMetrics);
app.post("/admin/reset", handlerReset);

app.use(middlewareErrorHandling);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
