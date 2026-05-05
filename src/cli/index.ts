#!/usr/bin/env node
// src/cli/index.ts
// ─── Candalena Claw — Main CLI Entry Point ───
// Professional CLI tool for Universal LMS Reminder Engine

import { Command } from "commander";
import { printBanner, printBlank, printLine, printStep, brand, getVersion, handleError } from "./ui";
import * as fs from "fs";
import * as path from "path";

const program = new Command();

// ─── First-run detection ──────────────────────────────────────
function checkFirstRun(): void {
  const markerDir = path.resolve(process.cwd(), ".candalena");
  const marker = path.join(markerDir, ".installed");
  const envPath = path.resolve(process.cwd(), ".env");

  if (!fs.existsSync(marker) && !fs.existsSync(envPath)) {
    console.log("");
    console.log(brand.primary.bold("  Welcome to Candalena Claw! 🦞"));
    console.log("");
    console.log("  This tool automates LMS assignment reminders");
    console.log("  via Telegram with multi-database support.");
    console.log("");
    console.log(brand.bold("  Get started:"));
    console.log("");
    printStep(1, `${brand.primary("candalena-claw init")}    ${brand.muted("— Initialize project")}`);
    printStep(2, `${brand.primary("candalena-claw setup")}   ${brand.muted("— Configure database & bot")}`);
    printStep(3, `${brand.primary("candalena-claw start")}   ${brand.muted("— Start the engine")}`);
    console.log("");
    printLine(brand.muted(`Run ${brand.white("candalena-claw --help")} for all commands.`));
    console.log("");

    // Create marker to skip next time
    if (!fs.existsSync(markerDir)) fs.mkdirSync(markerDir, { recursive: true });
    fs.writeFileSync(marker, new Date().toISOString(), "utf-8");
  }
}

// ─── Help Formatter ───────────────────────────────────────────
function customHelp(): void {
  printBanner();

  console.log(brand.bold("  Usage:"));
  console.log(`    ${brand.white("candalena-claw")} ${brand.primary("<command>")} ${brand.muted("[options]")}`);
  printBlank();

  console.log(brand.bold("  Commands:"));
  const cmds = [
    ["init", "Initialize project folder"],
    ["setup", "Interactive configuration wizard"],
    ["install-ai", "Install & configure OpenClaw AI Gateway"],
    ["ai-status", "Check OpenClaw AI system status"],
    ["start", "Start automation engine"],
    ["stop", "Stop running engine"],
    ["status", "Show system status"],
    ["doctor", "Diagnose problems"],
    ["logs", "View realtime logs"],
    ["config", "Show current configuration"],
    ["reset", "Reset installation"],
    ["test", "Send test reminder"],
    ["update", "Update to latest version"],
    ["uninstall", "Completely remove Candalena Claw"],
  ];

  for (const [cmd, desc] of cmds) {
    console.log(`    ${brand.primary(cmd.padEnd(12))} ${brand.muted(desc)}`);
  }

  printBlank();
  console.log(brand.bold("  Options:"));
  console.log(`    ${brand.primary("-h, --help".padEnd(12))} ${brand.muted("Show help")}`);
  console.log(`    ${brand.primary("-v, --version".padEnd(12))} ${brand.muted("Show version")}`);

  printBlank();
  console.log(brand.bold("  Examples:"));
  console.log(`    ${brand.muted("$")} ${brand.white("candalena-claw setup")}`);
  console.log(`    ${brand.muted("$")} ${brand.white("candalena-claw start")}`);
  console.log(`    ${brand.muted("$")} ${brand.white("candalena-claw doctor")}`);
  printBlank();
}

// ─── Program Setup ────────────────────────────────────────────
program
  .name("candalena-claw")
  .description("Universal LMS Reminder Engine")
  .version(getVersion(), "-v, --version", "Show version")
  .helpOption("-h, --help", "Show help")
  .addHelpCommand(false)
  .configureOutput({
    writeOut: () => {},
    writeErr: () => {},
  });

// Override help
program.on("--help", () => {});
program.helpInformation = () => "";

// ─── Commands ─────────────────────────────────────────────────

program
  .command("init")
  .description("Initialize project folder")
  .action(async () => {
    try {
      const { initCommand } = require("./commands/init");
      await initCommand();
    } catch (err) { handleError(err); process.exit(1); }
  });

program
  .command("setup")
  .description("Interactive configuration wizard")
  .action(async () => {
    try {
      const { setupCommand } = require("./commands/setup");
      await setupCommand();
    } catch (err) { handleError(err); process.exit(1); }
  });

program
  .command("start")
  .description("Start automation engine")
  .action(async () => {
    try {
      const { startCommand } = require("./commands/start");
      await startCommand();
    } catch (err) { handleError(err); process.exit(1); }
  });

program
  .command("stop")
  .description("Stop running engine")
  .action(async () => {
    try {
      const { stopCommand } = require("./commands/stop");
      await stopCommand();
    } catch (err) { handleError(err); process.exit(1); }
  });

program
  .command("status")
  .description("Show system status")
  .action(async () => {
    try {
      const { statusCommand } = require("./commands/status");
      await statusCommand();
    } catch (err) { handleError(err); process.exit(1); }
  });

program
  .command("doctor")
  .description("Diagnose problems")
  .action(async () => {
    try {
      const { doctorCommand } = require("./commands/doctor");
      await doctorCommand();
    } catch (err) { handleError(err); process.exit(1); }
  });

program
  .command("logs")
  .description("View realtime logs")
  .action(async () => {
    try {
      const { logsCommand } = require("./commands/logs");
      await logsCommand();
    } catch (err) { handleError(err); process.exit(1); }
  });

program
  .command("config")
  .description("Show current configuration")
  .action(async () => {
    try {
      const { configCommand } = require("./commands/config");
      await configCommand();
    } catch (err) { handleError(err); process.exit(1); }
  });

program
  .command("reset")
  .description("Reset installation")
  .action(async () => {
    try {
      const { resetCommand } = require("./commands/reset");
      await resetCommand();
    } catch (err) { handleError(err); process.exit(1); }
  });

program
  .command("test")
  .description("Send test reminder")
  .action(async () => {
    try {
      const { testCommand } = require("./commands/test");
      await testCommand();
    } catch (err) { handleError(err); process.exit(1); }
  });

program
  .command("update")
  .description("Update to latest version")
  .action(async () => {
    try {
      const { updateCommand } = require("./commands/update");
      await updateCommand();
    } catch (err) { handleError(err); process.exit(1); }
  });

program
  .command("uninstall")
  .description("Completely remove Candalena Claw")
  .action(async () => {
    try {
      const { uninstallCommand } = require("./commands/uninstall");
      await uninstallCommand();
    } catch (err) { handleError(err); process.exit(1); }
  });

program
  .command("install-ai")
  .description("Install & configure OpenClaw AI Gateway")
  .action(async () => {
    try {
      const { installAiCommand } = require("./commands/install-ai");
      await installAiCommand();
    } catch (err) { handleError(err); process.exit(1); }
  });

program
  .command("ai-status")
  .description("Check OpenClaw AI system status")
  .action(async () => {
    try {
      const { aiStatusCommand } = require("./commands/ai-status");
      await aiStatusCommand();
    } catch (err) { handleError(err); process.exit(1); }
  });

// ─── Parse & Execute ──────────────────────────────────────────

const args = process.argv.slice(2);

if (args.length === 0) {
  // No command — check first run or show help
  const markerFile = path.resolve(process.cwd(), ".candalena", ".installed");
  if (!fs.existsSync(markerFile)) {
    checkFirstRun();
  } else {
    customHelp();
  }
} else if (args.includes("--version") || args.includes("-v")) {
  // Custom version output
  console.log(`${brand.primary("candalena-claw")} ${brand.bold("v" + getVersion())}`);
} else if (args.includes("--help") || args.includes("-h")) {
  customHelp();
} else {
  program.parse(process.argv);
}
