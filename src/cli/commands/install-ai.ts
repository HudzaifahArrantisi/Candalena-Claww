// src/cli/commands/install-ai.ts
// ─── OpenClaw AI Installer Command ───
// Main CLI command: `candalena-claw install-ai`

import inquirer from "inquirer";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { printBanner, printHeader, printOk, printFail, printWarn, printInfo, printLine, printBlank, brand, createSpinner, handleError } from "../ui";
import {
  isOpenClawInstalled,
  installOpenClaw,
  runOnboarding,
  ensureOpenClawDirs,
  injectTelegramConfig,
  injectToolsConfig,
  injectHooksConfig,
  startGateway,
  OPENCLAW_HOME,
  OPENCLAW_SKILLS_DIR,
} from "../../openclaw/installer";
import { scrapeDatabase } from "../../openclaw/schema-scraper";
import { analyzeSchemaWithAI, isGatewayReachable } from "../../openclaw/ai-bridge";
import { buildSkillContent, SYSTEM_PROMPT } from "../../openclaw/ai-prompt";
import { createDeadlineCronJobs } from "../../openclaw/cron-setup";
import { DatabaseCredentials, DatabaseDDL } from "../../openclaw/types";

export async function installAiCommand(): Promise<void> {
  printBanner();
  printHeader("🧠 AI-Powered Setup — OpenClaw Integration");

  printLine(brand.muted("This wizard will:"));
  printLine(`  ${brand.primary("1.")} Install OpenClaw AI Gateway`);
  printLine(`  ${brand.primary("2.")} Configure Telegram Bot`);
  printLine(`  ${brand.primary("3.")} Scrape your LMS database schema`);
  printLine(`  ${brand.primary("4.")} Let AI analyze & map your database`);
  printLine(`  ${brand.primary("5.")} Set up 24/7 monitoring cron jobs`);
  printBlank();

  // ─── Step 1: Install OpenClaw ─────────────────────────────────
  printHeader("Step 1/5 — Install OpenClaw");

  if (isOpenClawInstalled()) {
    printOk("OpenClaw is already installed.");
  } else {
    const { confirmInstall } = await inquirer.prompt([{
      type: "confirm",
      name: "confirmInstall",
      message: "OpenClaw is not installed. Install now?",
      default: true,
    }]);

    if (!confirmInstall) {
      printWarn("Installation cancelled. Install OpenClaw manually:");
      printLine(`  ${brand.white("npm install -g openclaw@latest")}`);
      return;
    }

    const spinner = createSpinner("Installing OpenClaw...");
    spinner.start();
    try {
      await installOpenClaw((msg) => { spinner.text = `  ${msg}`; });
      spinner.succeed("  OpenClaw installed successfully.");
    } catch (err: any) {
      spinner.fail(`  ${err.message}`);
      return;
    }

    // Run onboarding
    const onboardSpinner = createSpinner("Running onboarding...");
    onboardSpinner.start();
    try {
      await runOnboarding((msg) => { onboardSpinner.text = `  ${msg}`; });
      onboardSpinner.succeed("  Onboarding complete.");
    } catch {
      onboardSpinner.warn("  Onboarding skipped — will configure manually.");
    }
  }

  ensureOpenClawDirs();

  // ─── Step 2: Telegram Configuration ───────────────────────────
  printHeader("Step 2/5 — Telegram Bot Configuration");

  printInfo("Create a bot via @BotFather on Telegram → /newbot");
  printBlank();

  const { botToken } = await inquirer.prompt([{
    type: "password",
    name: "botToken",
    message: "Telegram Bot Token:",
    mask: "*",
    validate: (v: string) => v.length > 10 || "Token too short",
  }]);

  // Ask for class→Telegram group mappings
  printBlank();
  printInfo("Now map each class to its Telegram group/channel.");
  printInfo("You can add the bot to groups later and get Chat IDs via @getidsbot");
  printBlank();

  const { numClasses } = await inquirer.prompt([{
    type: "number",
    name: "numClasses",
    message: "How many class groups to configure? (0 to skip):",
    default: 0,
  }]);

  const telegramGroups: Record<string, string> = {};
  for (let i = 0; i < (numClasses || 0); i++) {
    const { className, chatId } = await inquirer.prompt([
      { type: "input", name: "className", message: `Class ${i + 1} name (e.g., TI-01):` },
      { type: "input", name: "chatId", message: `Telegram Chat ID for this class:` },
    ]);
    if (className && chatId) telegramGroups[className] = chatId;
  }

  // Inject Telegram config into openclaw.json
  const configSpinner = createSpinner("Injecting Telegram config...");
  configSpinner.start();
  injectTelegramConfig(botToken, telegramGroups);
  injectToolsConfig();
  injectHooksConfig(`candalena-${Date.now()}`);
  configSpinner.succeed("  Telegram configured in ~/.openclaw/openclaw.json");

  // ─── Step 3: Database Schema Scraping ─────────────────────────
  printHeader("Step 3/5 — Database Schema Scraping");

  const envPath = path.resolve(process.cwd(), ".env");
  let dbCreds: DatabaseCredentials;

  // Try reading from existing .env
  if (fs.existsSync(envPath)) {
    printInfo("Found existing .env — reading database credentials...");
    const envContent = fs.readFileSync(envPath, "utf-8");
    const envVars: Record<string, string> = {};
    for (const line of envContent.split("\n")) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) envVars[match[1].trim()] = match[2].trim();
    }

    dbCreds = {
      type: (envVars.DB_TYPE as any) || "mysql",
      host: envVars.DB_HOST || "localhost",
      port: parseInt(envVars.DB_PORT || "3306"),
      user: envVars.DB_USER || "root",
      password: envVars.DB_PASS || "",
      database: envVars.DB_NAME || "openclaw",
      uri: envVars.DB_URI,
    };

    printOk(`Database: ${dbCreds.type}://${dbCreds.host}:${dbCreds.port}/${dbCreds.database}`);

    const { useExisting } = await inquirer.prompt([{
      type: "confirm",
      name: "useExisting",
      message: "Use these credentials?",
      default: true,
    }]);

    if (!useExisting) {
      dbCreds = await promptDatabaseCredentials();
    }
  } else {
    dbCreds = await promptDatabaseCredentials();
  }

  // Scrape the database
  const scrapeSpinner = createSpinner("Scraping database schema (information_schema)...");
  scrapeSpinner.start();

  let ddl: DatabaseDDL;
  try {
    ddl = await scrapeDatabase(dbCreds);
    scrapeSpinner.succeed(`  Schema scraped: ${ddl.tables.length} tables, ${ddl.foreignKeys.length} foreign keys`);
  } catch (err: any) {
    scrapeSpinner.fail(`  Failed to scrape database: ${err.message}`);
    printWarn("Check your database credentials and try again.");
    return;
  }

  // Save DDL to file for reference
  const ddlPath = path.join(process.cwd(), ".candalena", "schema-ddl.sql");
  const candalenaDir = path.dirname(ddlPath);
  if (!fs.existsSync(candalenaDir)) fs.mkdirSync(candalenaDir, { recursive: true });
  fs.writeFileSync(ddlPath, ddl.rawDDL, "utf-8");
  printOk(`DDL saved to ${ddlPath}`);

  // Show table summary
  printBlank();
  printLine(brand.bold("Detected Tables:"));
  for (const t of ddl.tables) {
    printLine(`  ${brand.primary("•")} ${t.tableName} (${t.columns.length} cols)`);
  }
  printBlank();

  // ─── Step 4: AI Schema Analysis ───────────────────────────────
  printHeader("Step 4/5 — AI Schema Analysis");

  let schemaMapping: Record<string, any> | null = null;

  // Check if gateway is running
  let gatewayUp = await isGatewayReachable();

  if (!gatewayUp) {
    printInfo("Starting OpenClaw Gateway...");
    try {
      await startGateway((msg) => printLine(`  ${msg}`));
      
      // Wait for gateway to become reachable (poll every 2s, up to 30s)
      let isReady = false;
      printLine(brand.muted("  Waiting for gateway to initialize..."));
      for (let i = 0; i < 15; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        if (await isGatewayReachable()) {
          isReady = true;
          break;
        }
      }
      
      if (!isReady) {
        printWarn("Gateway took too long to start. AI Analysis and Cron creation might fail.");
      } else {
        printLine(brand.success("  Gateway is ready!"));
        gatewayUp = true;
      }
    } catch {
      printWarn("Could not auto-start gateway. Start manually:");
      printLine(`  ${brand.white("openclaw gateway")}`);
    }
  }

  if (gatewayUp) {
    const aiSpinner = createSpinner("Sending schema to OpenClaw AI for analysis...");
    aiSpinner.start();

    try {
      schemaMapping = await analyzeSchemaWithAI(ddl) as any;
      if (schemaMapping) {
        aiSpinner.succeed("  AI analysis complete.");
        printBlank();
        printLine(brand.bold("AI Mapping Result:"));
        printLine(`  Dosen:      ${brand.success((schemaMapping as any).dosenTable || "?")}`);
        printLine(`  Mahasiswa:  ${brand.success((schemaMapping as any).mahasiswaTable || "?")}`);
        printLine(`  Kelas:      ${brand.success((schemaMapping as any).kelasTable || "?")}`);
        printLine(`  Tugas:      ${brand.success((schemaMapping as any).tugasTable || "?")}`);
        printLine(`  Mata Kuliah:${brand.success((schemaMapping as any).mataKuliahTable || "?")}`);
        printBlank();
      } else {
        aiSpinner.warn("  AI could not parse the schema — will use DDL directly.");
      }
    } catch {
      aiSpinner.warn("  AI analysis unavailable — will inject raw DDL into skill.");
    }
  } else {
    printWarn("OpenClaw Gateway not running — skipping AI analysis.");
    printInfo("The raw DDL will be injected into the skill file for later analysis.");
  }

  // Save mapping
  if (schemaMapping) {
    const mappingPath = path.join(process.cwd(), ".candalena", "schema-mapping.json");
    fs.writeFileSync(mappingPath, JSON.stringify(schemaMapping, null, 2), "utf-8");
    printOk(`Mapping saved to ${mappingPath}`);
  }

  // ─── Write SKILL.md ───────────────────────────────────────────
  const skillContent = buildSkillContent(
    dbCreds.type,
    dbCreds.host,
    dbCreds.port,
    dbCreds.database,
    dbCreds.user,
    telegramGroups,
    schemaMapping || undefined,
  );

  const skillDir = path.join(OPENCLAW_SKILLS_DIR, "candalena-lms");
  if (!fs.existsSync(skillDir)) fs.mkdirSync(skillDir, { recursive: true });
  const skillPath = path.join(skillDir, "SKILL.md");
  fs.writeFileSync(skillPath, skillContent, "utf-8");
  printOk(`Skill file written to ${skillPath}`);

  // Also write the raw DDL alongside the skill
  fs.writeFileSync(path.join(skillDir, "schema.sql"), ddl.rawDDL, "utf-8");

  // ─── Step 5: Cron Jobs & Gateway ──────────────────────────────
  printHeader("Step 5/5 — 24/7 Monitoring Setup");

  const { timezone } = await inquirer.prompt([{
    type: "input",
    name: "timezone",
    message: "Timezone (e.g., Asia/Jakarta):",
    default: "Asia/Jakarta",
  }]);

  // Determine primary notification target
  const primaryChatId = Object.values(telegramGroups)[0] || "";

  // Create cron jobs
  printInfo("Creating scheduled monitoring jobs...");
  await createDeadlineCronJobs(timezone, primaryChatId, (msg) => printLine(msg));

  // ─── DONE ─────────────────────────────────────────────────────
  printBlank();
  printLine(brand.primary.bold("═".repeat(52)));
  printLine(brand.success.bold("  🎉 Setup Complete!"));
  printLine(brand.primary.bold("═".repeat(52)));
  printBlank();
  printLine(brand.bold("  What was configured:"));
  printLine(`  ${brand.success("✔")} OpenClaw AI Gateway installed`);
  printLine(`  ${brand.success("✔")} Telegram Bot configured`);
  printLine(`  ${brand.success("✔")} Database schema scraped (${ddl.tables.length} tables)`);
  printLine(`  ${brand.success("✔")} AI skill deployed to ~/.openclaw/skills/candalena-lms/`);
  printLine(`  ${brand.success("✔")} Cron jobs for 24/7 monitoring`);
  printBlank();
  printLine(brand.bold("  Next steps:"));
  printLine(`  ${brand.primary("1.")} Start the gateway: ${brand.white("openclaw gateway")}`);
  printLine(`  ${brand.primary("2.")} Check cron jobs:   ${brand.white("openclaw cron list")}`);
  printLine(`  ${brand.primary("3.")} View dashboard:    ${brand.white("openclaw dashboard")}`);
  printLine(`  ${brand.primary("4.")} Monitor logs:      ${brand.white("openclaw logs --follow")}`);
  printBlank();
  printLine(brand.muted("  OpenClaw AI will now monitor your LMS database 24/7"));
  printLine(brand.muted("  and send Telegram reminders automatically. 🦞"));
  printBlank();
}

// ─── Helper: Prompt for DB credentials ──────────────────────────

async function promptDatabaseCredentials(): Promise<DatabaseCredentials> {
  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "type",
      message: "Database engine:",
      choices: [
        { name: "MySQL / MariaDB", value: "mysql" },
        { name: "PostgreSQL", value: "postgres" },
        { name: "MongoDB", value: "mongodb" },
      ],
    },
    { type: "input", name: "host", message: "Host:", default: "localhost" },
    {
      type: "input", name: "port", message: "Port:",
      default: (answers: any) => {
        const portDefaults: Record<string, string> = { mysql: "3306", postgres: "5432", mongodb: "27017" };
        return portDefaults[answers.type] || "3306";
      },
    },
    { type: "input", name: "user", message: "Username:", default: "root" },
    { type: "password", name: "password", message: "Password:", mask: "*" },
    { type: "input", name: "database", message: "Database name:" },
  ]);

  return {
    type: answers.type,
    host: answers.host,
    port: parseInt(answers.port),
    user: answers.user,
    password: answers.password,
    database: answers.database,
  };
}
