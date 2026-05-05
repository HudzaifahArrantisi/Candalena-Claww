// src/cli/commands/start.ts
// ─── candalena-claw start ───
// Starts the engine, scheduler, and API server with live status panel

import {
  printBanner,
  printHeader,
  printOk,
  printFail,
  printBlank,
  printLine,
  brand,
  createSpinner,
  icon,
  requireSetup,
  handleError,
  getVersion,
} from "../ui";
import boxen from "boxen";

export async function startCommand(): Promise<void> {
  if (!requireSetup()) return;

  printBanner();
  printHeader("Starting Engine");

  const steps = [
    { label: "Loading configuration", fn: loadConfig },
    { label: "Connecting to database", fn: connectDatabase },
    { label: "Detecting schema", fn: detectSchema },
    { label: "Starting scheduler", fn: startSchedulerStep },
    { label: "Starting API server", fn: startApiServer },
  ];

  const results: { label: string; ok: boolean; detail: string }[] = [];

  for (const step of steps) {
    const spinner = createSpinner(step.label + "...");
    spinner.start();
    try {
      const detail = await step.fn();
      spinner.succeed(brand.success(`  ${step.label}`));
      results.push({ label: step.label, ok: true, detail });
    } catch (err: any) {
      spinner.fail(brand.error(`  ${step.label}`));
      handleError(err);
      results.push({ label: step.label, ok: false, detail: err.message });
      // Don't continue if critical step fails
      if (step.label.includes("database") || step.label.includes("configuration")) {
        return;
      }
    }
  }

  // ── Print Status Panel ──
  printBlank();

  const statusLines = [
    `${brand.primary.bold("Candalena Claw")} ${brand.muted("v" + getVersion())}`,
    "",
    ...results.map((r) =>
      r.ok
        ? `${brand.success("●")} ${r.label} ${brand.muted(r.detail ? "— " + r.detail : "")}`
        : `${brand.error("●")} ${r.label} ${brand.muted(r.detail ? "— " + r.detail : "")}`
    ),
    "",
    `${brand.muted("Press")} ${brand.bold("Ctrl+C")} ${brand.muted("to stop")}`,
  ];

  console.log(
    boxen(statusLines.join("\n"), {
      padding: { top: 0, bottom: 0, left: 2, right: 2 },
      borderColor: "magenta",
      borderStyle: "round",
      title: " Status ",
      titleAlignment: "center",
    })
  );
  printBlank();
}

// ─── Step Implementations ─────────────────────────────────────

async function loadConfig(): Promise<string> {
  // Load dotenv
  require("dotenv").config();
  const { ENV } = require("../../config/env");
  await sleep(200);
  return `DB: ${ENV.DB_TYPE}`;
}

async function connectDatabase(): Promise<string> {
  const { createAdapter } = require("../../adapters/adapter.factory");
  const adapter = createAdapter();
  await adapter.testConnection();
  return adapter.engineName;
}

async function detectSchema(): Promise<string> {
  const { startEngine } = require("../../core/engine");
  // Engine handles schema detection internally
  // We've already connected, so just detect schema
  const { getAdapter } = require("../../adapters/adapter.factory");
  const { ENV } = require("../../config/env");
  const adapter = getAdapter();
  const schema = await adapter.detectSchema(ENV.TABLE_NAME || "tugas");
  const columnCount = Object.values(schema).filter(Boolean).length;
  return `${columnCount} columns mapped`;
}

async function startSchedulerStep(): Promise<string> {
  const { startScheduler } = require("../../core/scheduler");
  const { ENV } = require("../../config/env");
  startScheduler();
  return `cron: ${ENV.CRON_SCHEDULE}`;
}

async function startApiServer(): Promise<string> {
  const { startServer } = require("../../server");
  const { ENV } = require("../../config/env");
  startServer();
  return `http://localhost:${ENV.PORT}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
