// src/cli/commands/config.ts
// ─── candalena-claw config ───

import { printBanner, printHeader, printBlank, printLine, brand, requireSetup, createTable } from "../ui";

export async function configCommand(): Promise<void> {
  if (!requireSetup()) return;
  printBanner();
  printHeader("Current Configuration");

  require("dotenv").config();
  const { ENV } = require("../../config/env");

  const mask = (val: string) => val ? "●".repeat(Math.min(val.length, 8)) + "..." : brand.muted("(empty)");
  const show = (val: string) => val || brand.muted("(empty)");
  const autoDetect = (val: string) => val || brand.secondary("auto-detect");

  const table = createTable(["Setting", "Value"]);
  table.push(
    [brand.bold("Database"), ""],
    ["DB_TYPE", show(ENV.DB_TYPE)],
    ["DB_HOST", show(ENV.DB_HOST)],
    ["DB_PORT", show(ENV.DB_PORT)],
    ["DB_USER", show(ENV.DB_USER)],
    ["DB_PASS", mask(ENV.DB_PASS)],
    ["DB_NAME", show(ENV.DB_NAME)],
    [brand.bold("Schema"), ""],
    ["TABLE_NAME", show(ENV.TABLE_NAME)],
    ["COL_TITLE", autoDetect(ENV.COL_TITLE)],
    ["COL_DEADLINE", autoDetect(ENV.COL_DEADLINE)],
    ["COL_TELEGRAM", autoDetect(ENV.COL_TELEGRAM)],
    ["COL_NOTIFIED", autoDetect(ENV.COL_NOTIFIED)],
    [brand.bold("Telegram"), ""],
    ["BOT_TOKEN", mask(ENV.TELEGRAM_BOT_TOKEN)],
    [brand.bold("Scheduler"), ""],
    ["CRON_SCHEDULE", show(ENV.CRON_SCHEDULE)],
    ["REMIND_DAYS", show(ENV.DEADLINE_REMIND_DAYS)],
    [brand.bold("Server"), ""],
    ["PORT", show(ENV.PORT)],
  );

  console.log(table.toString());
  printBlank();
  printLine(brand.muted("Passwords are hidden. Edit .env to change values."));
  printBlank();
}
