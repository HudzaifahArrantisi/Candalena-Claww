// src/cli/commands/install-ai.ts
// ─── Candalena Claw Setup Wizard ───
// Standalone 3-step configuration wizard. No OpenClaw dependency.
// Generates a .env file and validates database/telegram connectivity.

import inquirer from "inquirer";
import * as fs from "fs";
import * as path from "path";
import { printBanner, printHeader, printOk, printFail, printWarn, printInfo, printLine, printBlank, brand, createSpinner, handleError } from "../ui";
import { scrapeDatabase } from "../../lib/schema-scraper";
import { DatabaseCredentials, DatabaseDDL } from "../../lib/types";
import { parseDatabaseUrl, detectCloudProvider, formatCredentialsSummary } from "../../lib/db-url-parser";

export async function installAiCommand(): Promise<void> {
  printBanner();
  printHeader("🦞 Candalena Claw — Setup Wizard");

  printLine(brand.muted("This wizard will:"));
  printLine(`  ${brand.primary("1.")} Configure your LMS Database connection`);
  printLine(`  ${brand.primary("2.")} Configure Telegram Bot & Channels`);
  printLine(`  ${brand.primary("→")} Generate a .env file and validate everything`);
  printBlank();

  // ─── Step 1: Database Configuration ─────────────────────────
  printHeader("Step 1/2 — Database Configuration");

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

    // Check if there's a DATABASE_URL in .env
    const existingUrl = envVars.DATABASE_URL || envVars.DB_URI || envVars.DB_URL;

    if (existingUrl) {
      try {
        dbCreds = parseDatabaseUrl(existingUrl);
        const provider = detectCloudProvider(existingUrl);
        const providerLabel = provider ? `${provider.icon} ${provider.name}` : "Cloud DB";
        printOk(`Found DATABASE_URL → ${providerLabel}`);
        printLine(`  ${brand.muted(formatCredentialsSummary(dbCreds))}`);
      } catch {
        dbCreds = {
          type: (envVars.DB_TYPE as any) || "mysql",
          host: envVars.DB_HOST || "localhost",
          port: parseInt(envVars.DB_PORT || "3306"),
          user: envVars.DB_USER || "root",
          password: envVars.DB_PASS || "",
          database: envVars.DB_NAME || "candalena",
        };
        printOk(`Database: ${dbCreds.type}://${dbCreds.host}:${dbCreds.port}/${dbCreds.database}`);
      }
    } else {
      dbCreds = {
        type: (envVars.DB_TYPE as any) || "mysql",
        host: envVars.DB_HOST || "localhost",
        port: parseInt(envVars.DB_PORT || "3306"),
        user: envVars.DB_USER || "root",
        password: envVars.DB_PASS || "",
        database: envVars.DB_NAME || "candalena",
      };
      printOk(`Database: ${dbCreds.type}://${dbCreds.host}:${dbCreds.port}/${dbCreds.database}`);
    }

    const { useExisting } = await inquirer.prompt([{
      type: "confirm",
      name: "useExisting",
      message: "Use these credentials?",
      default: true,
    }]);

    if (!useExisting) {
      dbCreds = await promptDatabaseConnection();
    }
  } else {
    dbCreds = await promptDatabaseConnection();
  }

  // Scrape the database to verify & analyze
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
  const candalenaDir = path.resolve(process.cwd(), ".candalena");
  if (!fs.existsSync(candalenaDir)) fs.mkdirSync(candalenaDir, { recursive: true });
  const ddlPath = path.join(candalenaDir, "schema-ddl.sql");
  fs.writeFileSync(ddlPath, ddl.rawDDL, "utf-8");
  printOk(`DDL saved to ${ddlPath}`);

  // Show table summary
  printBlank();
  printLine(brand.bold("Detected Tables:"));
  for (const t of ddl.tables) {
    printLine(`  ${brand.primary("•")} ${t.tableName} (${t.columns.length} cols)`);
  }
  printBlank();

  // ─── Step 2: Telegram Bot Configuration ─────────────────────
  printHeader("Step 2/2 — Telegram Bot Configuration");

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
  printInfo("Now map each class to its Telegram channel/group.");
  printInfo("You can use: Username (@channel), Link (t.me/channel), or Numeric ID (-100123...)");
  printInfo("Note: If using username/link, ensure the channel is PUBLIC and bot is Admin.");
  printBlank();

  const { numClasses } = await inquirer.prompt([{
    type: "number",
    name: "numClasses",
    message: "How many class groups to configure? (0 to skip):",
    default: 1,
  }]);

  const telegramGroups: Record<string, string> = {};
  for (let i = 0; i < (numClasses || 0); i++) {
    const { className, chatInput } = await inquirer.prompt([
      { type: "input", name: "className", message: `Class ${i + 1} name (e.g., TI-01):` },
      { type: "input", name: "chatInput", message: `Telegram Username / Link / ID:` },
    ]);

    if (className && chatInput) {
      let finalChatId = chatInput.trim();

      // Parse t.me/username links
      if (finalChatId.includes("t.me/")) {
        const parts = finalChatId.split("t.me/");
        finalChatId = "@" + parts[parts.length - 1].replace(/\/.*/, "");
      }
      // Add @ symbol if it's a raw string without - or @
      else if (!finalChatId.startsWith("-") && !finalChatId.startsWith("@") && isNaN(Number(finalChatId))) {
        finalChatId = "@" + finalChatId;
      }

      telegramGroups[className] = finalChatId;
    }
  }

  const aiProvider = "skip";
  const aiApiKey = "";
  const aiModel = "";

  // ─── Generate .env File ─────────────────────────────────────
  printBlank();
  printHeader("Generating Configuration");

  const envSpinner = createSpinner("Writing .env file...");
  envSpinner.start();

  // Build telegram groups as comma-separated JSON for the .env
  const groupEntries = Object.entries(telegramGroups);
  const telegramTargets = groupEntries.map(([, chatId]) => chatId).join(",");
  const telegramGroupsJson = JSON.stringify(telegramGroups);
  const primaryChatId = groupEntries.length > 0 ? groupEntries[0][1] : "";

  const envLines: string[] = [
    "# ═══════════════════════════════════════════",
    "# Candalena Claw — Environment Configuration",
    `# Generated: ${new Date().toISOString()}`,
    "# ═══════════════════════════════════════════",
    "",
    "# ─── Database ──────────────────────────────",
    `DB_TYPE=${dbCreds.type}`,
    `DB_HOST=${dbCreds.host}`,
    `DB_PORT=${dbCreds.port}`,
    `DB_USER=${dbCreds.user}`,
    `DB_PASS=${dbCreds.password}`,
    `DB_NAME=${dbCreds.database}`,
  ];

  if (dbCreds.uri) {
    envLines.push(`DATABASE_URL=${dbCreds.uri}`);
  }
  if (dbCreds.ssl) {
    envLines.push(`DB_SSL=true`);
  }

  envLines.push(
    "",
    "# ─── Telegram ─────────────────────────────",
    `TELEGRAM_BOT_TOKEN=${botToken}`,
    `TELEGRAM_CHAT_ID=${primaryChatId}`,
    `TELEGRAM_TARGETS=${telegramTargets}`,
    `TELEGRAM_GROUPS=${telegramGroupsJson}`,
    "",
    "# ─── AI Provider ──────────────────────────",
    `AI_PROVIDER=${aiProvider || "skip"}`,
    `AI_API_KEY=${aiApiKey}`,
    `AI_MODEL=${aiModel}`,
    "",
    "# ─── Scheduler ────────────────────────────",
    "CRON_SCHEDULE=0 7,12,20 * * *",
    "DEADLINE_REMIND_DAYS=3,1,0",
    "TZ=Asia/Jakarta",
    "",
    "# ─── Server (optional, for status API) ────",
    "PORT=3500",
    "",
    "# ─── Schema (auto-detect if empty) ────────",
    "TABLE_NAME=tugas",
    "# COL_ID=",
    "# COL_TITLE=",
    "# COL_DEADLINE=",
    "# COL_COURSE=",
    "# COL_LECTURER=",
    "# COL_SEMESTER=",
    "# COL_KELAS=",
    "# COL_TELEGRAM=",
    "# COL_NOTIFIED=",
  );

  fs.writeFileSync(envPath, envLines.join("\n"), "utf-8");
  envSpinner.succeed(`  Configuration saved to ${envPath}`);

  // Save schema mapping
  const mappingPath = path.join(candalenaDir, "schema-mapping.json");
  const schemaInfo = {
    generatedAt: new Date().toISOString(),
    dbType: dbCreds.type,
    host: dbCreds.host,
    database: dbCreds.database,
    tables: ddl.tables.map(t => ({ name: t.tableName, columns: t.columns.length })),
    foreignKeys: ddl.foreignKeys.length,
    telegramGroups,
  };
  fs.writeFileSync(mappingPath, JSON.stringify(schemaInfo, null, 2), "utf-8");

  // ─── DONE ─────────────────────────────────────────────────
  printBlank();
  printLine(brand.primary.bold("═".repeat(52)));
  printLine(brand.success.bold("  🎉 Setup Complete!"));
  printLine(brand.primary.bold("═".repeat(52)));
  printBlank();
  printLine(brand.bold("  What was configured:"));
  printLine(`  ${brand.success("✔")} Database connection verified (${ddl.tables.length} tables)`);
  printLine(`  ${brand.success("✔")} Telegram Bot configured`);
  if (groupEntries.length > 0) {
    for (const [className, chatId] of groupEntries) {
      printLine(`    ${brand.muted("→")} ${className}: ${chatId}`);
    }
  }
  printLine(`  ${brand.success("✔")} .env file generated`);
  printLine(`  ${brand.success("✔")} Schema DDL saved`);
  printBlank();
  printLine(brand.bold("  Next steps:"));
  printLine(`  ${brand.primary("1.")} Start the daemon:    ${brand.white("candalena-claw start")}`);
  printLine(`  ${brand.primary("2.")} Or use Docker:       ${brand.white("docker compose up -d")}`);
  printLine(`  ${brand.primary("3.")} Or use PM2:          ${brand.white("pm2 start dist/engine/daemon.js")}`);
  printLine(`  ${brand.primary("4.")} Check status:        ${brand.white("candalena-claw status")}`);
  printLine(`  ${brand.primary("5.")} Send test message:   ${brand.white("candalena-claw test")}`);
  printBlank();
  printLine(brand.muted("  The daemon will monitor your database 24/7"));
  printLine(brand.muted("  and send Telegram reminders on H-3, H-1, and H-0. 🦞"));
  printBlank();
}

// ─── Helper: Prompt for DB connection (URL or Manual) ───────────

async function promptDatabaseConnection(): Promise<DatabaseCredentials> {
  printBlank();
  printLine(brand.bold("  Supported cloud databases:"));
  printLine(`  ${brand.muted("⚡ Supabase  🐘 Neon DB  🚂 Railway  🍃 MongoDB Atlas")}`);
  printLine(`  ${brand.muted("🪐 PlanetScale  ☁️  Aiven  🪳 CockroachDB")}`);
  printBlank();

  const { connectionMethod } = await inquirer.prompt([{
    type: "list",
    name: "connectionMethod",
    message: "How do you want to connect to your database?",
    choices: [
      {
        name: "📋 Paste a Database URL (Supabase, Neon, Railway, Atlas, etc.)",
        value: "url",
      },
      {
        name: "✏️  Enter details manually (Host, Port, User, Password)",
        value: "manual",
      },
    ],
  }]);

  if (connectionMethod === "url") {
    return await promptDatabaseUrl();
  } else {
    return await promptDatabaseCredentials();
  }
}

// ─── Helper: Prompt for Database URL ────────────────────────────

async function promptDatabaseUrl(): Promise<DatabaseCredentials> {
  printBlank();
  printLine(brand.muted("  Paste the full connection string from your cloud dashboard."));
  printLine(brand.muted("  Examples:"));
  printLine(brand.muted("    postgresql://user:pass@db.abc123.supabase.co:5432/postgres"));
  printLine(brand.muted("    postgresql://user:pass@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require"));
  printLine(brand.muted("    mongodb+srv://user:pass@cluster0.abc123.mongodb.net/mydb"));
  printBlank();

  const { dbUrl } = await inquirer.prompt([{
    type: "input",
    name: "dbUrl",
    message: "Database URL:",
    validate: (v: string) => {
      const trimmed = v.trim();
      if (!trimmed) return "URL cannot be empty.";
      if (!/^(postgres(ql)?|mysql|mongodb(\+srv)?):\/\//i.test(trimmed)) {
        return "URL must start with postgresql://, mysql://, or mongodb://";
      }
      return true;
    },
  }]);

  const spinner = createSpinner("Parsing connection string...");
  spinner.start();

  try {
    const creds = parseDatabaseUrl(dbUrl);
    const provider = detectCloudProvider(dbUrl);

    if (provider) {
      spinner.succeed(`  ${provider.icon} ${provider.name} detected → ${creds.type}://${creds.host}/${creds.database}`);
    } else {
      spinner.succeed(`  Parsed: ${creds.type}://${creds.host}:${creds.port}/${creds.database}`);
    }

    if (creds.ssl) {
      printLine(`  ${brand.success("🔒")} SSL connection enabled`);
    }

    // Test connection
    printBlank();
    const testSpinner = createSpinner("Testing database connection...");
    testSpinner.start();

    try {
      await scrapeDatabase(creds);
      testSpinner.succeed("  Connection successful! Database is reachable.");
    } catch (err: any) {
      testSpinner.warn(`  Connection test failed: ${err.message}`);
      printWarn("The URL might be incorrect, or your IP may need to be allowed in the cloud dashboard.");

      const { retryUrl } = await inquirer.prompt([{
        type: "confirm",
        name: "retryUrl",
        message: "Try entering the URL again?",
        default: true,
      }]);

      if (retryUrl) {
        return await promptDatabaseUrl();
      }
    }

    return creds;
  } catch (err: any) {
    spinner.fail(`  ${err.message}`);
    printBlank();

    const { fallbackManual } = await inquirer.prompt([{
      type: "confirm",
      name: "fallbackManual",
      message: "URL parsing failed. Enter credentials manually instead?",
      default: true,
    }]);

    if (fallbackManual) {
      return await promptDatabaseCredentials();
    }

    // Re-prompt URL
    return await promptDatabaseUrl();
  }
}

// ─── Helper: Prompt for DB credentials manually ─────────────────

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
