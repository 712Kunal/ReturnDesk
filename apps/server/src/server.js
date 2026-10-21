import express from "express";
import "dotenv/config";
import cors from "cors";
import requestsRouter from "./routes/requests.js";
import { AppError, errorHandler } from "./errors.js";

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL?.split(",") ?? "*" }));
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/requests", requestsRouter);

app.use((req, res, next) =>
  next(
    new AppError(
      404,
      "ROUTE_NOT_FOUND",
      `No route for ${req.method} ${req.path}`,
    ),
  ),
);
app.use(errorHandler);

const port = process.env.PORT || 4000;
app.listen(port, () =>
  console.log(`API listening on http://localhost:${port}`),
);
