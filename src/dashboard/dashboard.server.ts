// src/dashboard/dashboard.server.ts
// ─── Candalena Claw v5.0 — Lightweight Web Dashboard ───
// Express server on a separate port. No external frontend framework.
// Serves a single-page admin panel with status, config, and real-time logs.

import express from "express";
import path from "path";
import { getLogBuffer, getLogLines } from "./log-buffer";

export interface DashboardConfig {
  targets: string;
  cronNewTask: string;
  cronDeadline: string;
  timezone: string;
  tableName: string;
  dbType: string;
  botActive: boolean;
  remindDays: string;
  version: string;
}

/**
 * Start the lightweight dashboard server.
 * Runs on a separate port, completely independent of the daemon cron jobs.
 */
export function startDashboard(port: number, config: DashboardConfig): void {
  const app = express();

  // ── Serve the dashboard HTML ──
  app.get("/", (_req, res) => {
    res.sendFile(path.join(__dirname, "views", "index.html"));
  });

  // ── API: System status ──
  app.get("/api/status", (_req, res) => {
    const uptimeSec = process.uptime();
    const hours = Math.floor(uptimeSec / 3600);
    const minutes = Math.floor((uptimeSec % 3600) / 60);
    const seconds = Math.floor(uptimeSec % 60);

    res.json({
      status: "running",
      uptime: `${hours}h ${minutes}m ${seconds}s`,
      uptimeSeconds: Math.round(uptimeSec),
      memoryUsage: {
        rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      },
      config: {
        targets: config.targets.split(",").map((t) => t.trim()).filter(Boolean),
        cronNewTask: config.cronNewTask,
        cronDeadline: config.cronDeadline,
        timezone: config.timezone,
        tableName: config.tableName,
        dbType: config.dbType,
        botActive: config.botActive,
        remindDays: config.remindDays,
      },
      version: config.version,
    });
  });

  // ── API: Real-time logs ──
  app.get("/api/logs", (_req, res) => {
    res.json({
      count: getLogBuffer().length,
      logs: getLogBuffer(),
    });
  });

  // ── API: Health check ──
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  app.listen(port, () => {
    console.log(`[Candalena] 📊 Dashboard running at http://localhost:${port}`);
  });
}
