// src/cli/commands/ai-status.ts
// ─── AI Status Command ───
// Shows current OpenClaw AI integration status

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { printBanner, printHeader, printOk, printFail, printWarn, printLine, printBlank, brand, createTable } from "../ui";
import { isOpenClawInstalled, getOpenClawVersion, readOpenClawConfig, OPENCLAW_HOME } from "../../openclaw/installer";
import { isGatewayReachable } from "../../openclaw/ai-bridge";
import { listCronJobs } from "../../openclaw/cron-setup";

export async function aiStatusCommand(): Promise<void> {
  printBanner();
  printHeader("🧠 OpenClaw AI — System Status");

  const table = createTable(["Component", "Status", "Details"]);

  // 1. OpenClaw Installation
  const installed = isOpenClawInstalled();
  const version = installed ? getOpenClawVersion() : null;
  table.push([
    "OpenClaw",
    installed ? brand.success("Installed") : brand.error("Not Found"),
    version || "Run: npm install -g openclaw@latest",
  ]);

  // 2. Gateway Status
  const gatewayUp = await isGatewayReachable();
  table.push([
    "Gateway",
    gatewayUp ? brand.success("Running") : brand.warning("Stopped"),
    gatewayUp ? "http://127.0.0.1:18789" : "Run: openclaw gateway",
  ]);

  // 3. Config File
  const configPath = path.join(OPENCLAW_HOME, "openclaw.json");
  const configExists = fs.existsSync(configPath);
  table.push([
    "Config",
    configExists ? brand.success("Found") : brand.error("Missing"),
    configExists ? configPath : "Run: candalena-claw install-ai",
  ]);

  // 4. Telegram
  const config = readOpenClawConfig();
  const tgConfigured = config?.channels?.telegram?.botToken;
  table.push([
    "Telegram",
    tgConfigured ? brand.success("Configured") : brand.warning("Not Set"),
    tgConfigured ? "Bot token present" : "Run: candalena-claw install-ai",
  ]);

  // 5. Skill File
  const skillPath = path.join(OPENCLAW_HOME, "skills", "candalena-lms", "SKILL.md");
  const skillExists = fs.existsSync(skillPath);
  table.push([
    "LMS Skill",
    skillExists ? brand.success("Deployed") : brand.warning("Missing"),
    skillExists ? skillPath : "Created during install-ai",
  ]);

  // 6. Schema DDL
  const ddlPath = path.resolve(process.cwd(), ".candalena", "schema-ddl.sql");
  const ddlExists = fs.existsSync(ddlPath);
  table.push([
    "DB Schema",
    ddlExists ? brand.success("Scraped") : brand.muted("Not scraped"),
    ddlExists ? ddlPath : "Scraped during install-ai",
  ]);

  // 7. Schema Mapping
  const mappingPath = path.resolve(process.cwd(), ".candalena", "schema-mapping.json");
  const mappingExists = fs.existsSync(mappingPath);
  table.push([
    "AI Mapping",
    mappingExists ? brand.success("Complete") : brand.muted("Pending"),
    mappingExists ? "AI-analyzed schema mapping" : "Needs running gateway",
  ]);

  console.log(table.toString());
  printBlank();

  // Cron jobs
  if (installed) {
    printLine(brand.bold("Cron Jobs:"));
    const jobs = listCronJobs();
    printLine(brand.muted(jobs));
  }

  printBlank();
}
