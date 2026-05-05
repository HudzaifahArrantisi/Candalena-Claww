// src/server.ts
import express from "express";
import taskRoute from "./api/task.route";
import statusRoute from "./api/status.route";
import { ENV } from "./config/env";

export function startServer(): void {
  const app = express();
  const port = parseInt(ENV.PORT, 10);

  app.use(express.json());

  app.get("/", (_req, res) => {
    res.json({
      name: "OpenClaw Reminder Engine",
      version: "2.0.0",
      status: "running",
      docs: {
        tasks: "/api/tugas",
        status: "/api/status",
      },
    });
  });

  app.use("/api", taskRoute);
  app.use("/api", statusRoute);

  app.listen(port, () => {
    console.log(`[OpenClaw] Server running at http://localhost:${port}`);
  });
}