// src/cli/commands/setup.ts
// ─── candalena-claw setup ───
// Interactive configuration wizard with validation

import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";
import {
  printBanner,
  printHeader,
  printSection,
  printOk,
  printWarn,
  printFail,
  printInfo,
  printLine,
  printBlank,
  printStep,
  brand,
  createSpinner,
  icon,
  handleError,
} from "../ui";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string, defaultVal?: string): Promise<string> {
  const suffix = defaultVal ? brand.muted(` [${defaultVal}]`) : "";
  return new Promise((resolve) => {
    rl.question(`  ${brand.secondary("?")} ${question}${suffix} ${brand.primary("›")} `, (answer) => {
      resolve(answer.trim() || defaultVal || "");
    });
  });
}

function choose(question: string, options: string[], defaultIdx = 0): Promise<string> {
  return new Promise((resolve) => {
    console.log(`  ${brand.secondary("?")} ${question}`);
    options.forEach((opt, i) => {
      const marker = i === defaultIdx
        ? brand.primary("❯ " + opt)
        : brand.muted("  " + opt);
      console.log(`    ${marker}`);
    });
    rl.question(`  ${brand.muted("Choice")} ${brand.muted(`(1-${options.length})`)} ${brand.primary("›")} `, (answer) => {
      const idx = parseInt(answer.trim(), 10) - 1;
      resolve(options[idx] || options[defaultIdx]);
    });
  });
}

export async function setupCommand(): Promise<void> {
  printBanner();
  printHeader("Interactive Setup Wizard");

  printLine("This wizard will configure your database, Telegram bot,");
  printLine("and scheduler settings.");
  printBlank();

  // ── 1. Database Type ──
  printSection(`${icon.db}  Database Configuration`);

  const dbTypeChoice = await choose("Select database engine:", [
    "MySQL / MariaDB",
    "PostgreSQL",
    "MongoDB",
  ], 0);

  const dbTypeMap: Record<string, string> = {
    "MySQL / MariaDB": "mysql",
    "PostgreSQL": "postgres",
    "MongoDB": "mongodb",
  };
  const dbType = dbTypeMap[dbTypeChoice] || "mysql";
  printOk(`Database: ${dbTypeChoice}`);

  const defaultPorts: Record<string, string> = {
    mysql: "3306",
    postgres: "5432",
    mongodb: "27017",
  };

  // ── Connection Details ──
  printBlank();
  let dbUri = "";
  let dbHost = "";
  let dbPort = "";
  let dbUser = "";
  let dbPass = "";
  let dbName = "";

  if (dbType === "mongodb") {
    const useUri = await ask("Use connection URI? (y/n)", "n");
    if (useUri.toLowerCase() === "y") {
      dbUri = await ask("MongoDB URI", "mongodb://localhost:27017");
    } else {
      dbHost = await ask("Host", "localhost");
      dbPort = await ask("Port", defaultPorts[dbType]);
      dbUser = await ask("Username (empty = no auth)", "");
      dbPass = await ask("Password", "");
    }
    dbName = await ask("Database name", "");
  } else {
    dbHost = await ask("Host", "localhost");
    dbPort = await ask("Port", defaultPorts[dbType]);
    dbUser = await ask("Username", dbType === "mysql" ? "root" : "postgres");
    dbPass = await ask("Password", "");
    dbName = await ask("Database name", "");
  }

  // ── Validate Connection ──
  const spinner = createSpinner("Testing database connection...");
  spinner.start();

  let dbConnected = false;
  try {
    await testDbConnection(dbType, { host: dbHost, port: dbPort, user: dbUser, password: dbPass, database: dbName, uri: dbUri });
    spinner.succeed(brand.success("  Database connection successful"));
    dbConnected = true;
  } catch (err: any) {
    spinner.fail(brand.error("  Database connection failed"));
    handleError(err);
    printInfo("You can fix this later by editing .env and running setup again.");
  }

  // ── 2. Schema Configuration ──
  printSection(`${icon.file}  Schema Configuration`);

  const tableName = await ask("Table/Collection name", "tugas");

  printBlank();
  printLine(brand.muted("Column mapping — leave empty for auto-detect:"));
  printBlank();

  const colTitle = await ask("Title column (COL_TITLE)", "");
  const colDeadline = await ask("Deadline column (COL_DEADLINE)", "");
  const colTelegram = await ask("Telegram channel column (COL_TELEGRAM)", "");
  const colNotified = await ask("Notified flag column (COL_NOTIFIED)", "");

  // ── 3. Schema Validation (if DB connected) ──
  if (dbConnected && dbName) {
    const schemaSpinner = createSpinner("Detecting schema...");
    schemaSpinner.start();
    try {
      const columns = await detectTableColumns(dbType, { host: dbHost, port: dbPort, user: dbUser, password: dbPass, database: dbName, uri: dbUri }, tableName);
      schemaSpinner.succeed(brand.success(`  Table "${tableName}" found — ${columns.length} columns`));

      // Validate required columns
      const requiredHints: Record<string, string[]> = {
        deadline: ["deadline", "due_date", "batas_waktu", "due", "duedate"],
        title: ["title", "judul", "nama_tugas", "name", "task", "subject", "tugas"],
      };

      for (const [field, hints] of Object.entries(requiredHints)) {
        const userCol = field === "deadline" ? colDeadline : colTitle;
        if (userCol) continue; // user specified manually

        const found = columns.find((c: string) =>
          hints.some((h) => c.toLowerCase() === h || c.toLowerCase().includes(h))
        );
        if (found) {
          printOk(`Auto-detected ${field}: "${found}"`);
        } else {
          printBlank();
          printWarn(`Column "${field}" not detected.`);
          printBlank();
          printLine(brand.bold("Possible fixes:"));
          printBlank();
          if (dbType !== "mongodb") {
            printStep(1, "Add the column:");
            printLine(`   ${brand.secondary(`ALTER TABLE ${tableName} ADD ${field === "deadline" ? "deadline DATETIME" : "title VARCHAR(255)"};`)}`, 4);
          }
          printStep(2, "Or map an existing column:");
          printLine(`   Edit .env: ${brand.secondary(`COL_${field.toUpperCase()}=your_column_name`)}`, 4);
          printBlank();
        }
      }
    } catch {
      schemaSpinner.warn(brand.warning(`  Table "${tableName}" not found — will be created on first run`));
    }
  }

  // ── 4. Telegram ──
  printSection(`${icon.bot}  Telegram Bot`);
  printLine(brand.muted("Create a bot via @BotFather → /newbot"));
  printBlank();

  const botToken = await ask("Bot Token", "");

  // Validate Telegram token
  if (botToken) {
    const tgSpinner = createSpinner("Validating Telegram Bot...");
    tgSpinner.start();
    try {
      const botName = await validateTelegramBot(botToken);
      tgSpinner.succeed(brand.success(`  Bot verified: @${botName}`));
    } catch {
      tgSpinner.fail(brand.error("  Invalid bot token"));
      printInfo("Check your token and try again later.");
    }
  } else {
    printWarn("No bot token provided — reminders will not be sent.");
  }

  // ── 5. Scheduler ──
  printSection(`${icon.clock}  Scheduler`);

  const cronChoice = await choose("Check interval:", [
    "Every 1 minute   (* * * * *)",
    "Every 5 minutes   (*/5 * * * *)",
    "Every 15 minutes  (*/15 * * * *)",
    "Every 1 hour      (0 * * * *)",
  ], 1);

  const cronMap: Record<string, string> = {
    "Every 1 minute   (* * * * *)": "* * * * *",
    "Every 5 minutes   (*/5 * * * *)": "*/5 * * * *",
    "Every 15 minutes  (*/15 * * * *)": "*/15 * * * *",
    "Every 1 hour      (0 * * * *)": "0 * * * *",
  };
  const cronSchedule = cronMap[cronChoice] || "*/5 * * * *";

  // ── 6. Deadline Reminders ──
  const deadlineDays = await ask("Reminder days before deadline (comma-separated)", "3,1,0");

  // ── 7. Server Port ──
  const port = await ask("API Server port", "3000");

  // ── Generate .env ──
  const envContent = [
    "# ═══════════════════════════════════════════════════════",
    "# Candalena Claw — Configuration",
    "# Generated by: candalena-claw setup",
    `# Date: ${new Date().toISOString()}`,
    "# ═══════════════════════════════════════════════════════",
    "",
    "# Database",
    `DB_TYPE=${dbType}`,
    `DB_HOST=${dbHost}`,
    `DB_PORT=${dbPort}`,
    `DB_USER=${dbUser}`,
    `DB_PASS=${dbPass}`,
    `DB_NAME=${dbName}`,
    dbUri ? `DB_URI=${dbUri}` : "# DB_URI=",
    "",
    "# Schema (empty = auto-detect)",
    `TABLE_NAME=${tableName}`,
    `COL_TITLE=${colTitle}`,
    `COL_DEADLINE=${colDeadline}`,
    `COL_TELEGRAM=${colTelegram}`,
    `COL_NOTIFIED=${colNotified}`,
    "",
    "# Telegram",
    `TELEGRAM_BOT_TOKEN=${botToken}`,
    "",
    "# Scheduler",
    `CRON_SCHEDULE=${cronSchedule}`,
    `DEADLINE_REMIND_DAYS=${deadlineDays}`,
    "",
    "# Server",
    `PORT=${port}`,
  ].join("\n");

  const envPath = path.resolve(process.cwd(), ".env");

  // Backup existing
  if (fs.existsSync(envPath)) {
    const backup = envPath + ".backup." + Date.now();
    fs.copyFileSync(envPath, backup);
    printInfo(`Backup saved: ${path.basename(backup)}`);
  }

  fs.writeFileSync(envPath, envContent, "utf-8");

  // ── Done ──
  printBlank();
  printOk(brand.success.bold("Configuration saved!"));
  printBlank();
  printLine(brand.bold("Next steps:"));
  printBlank();
  printStep(1, `${brand.primary("candalena-claw doctor")}  ${brand.muted("— Verify everything is working")}`);
  printStep(2, `${brand.primary("candalena-claw start")}   ${brand.muted("— Start the engine")}`);
  printBlank();

  rl.close();
}

// ─── Helper: Test DB Connection ───────────────────────────────
async function testDbConnection(
  dbType: string,
  config: { host: string; port: string; user: string; password: string; database: string; uri: string }
): Promise<void> {
  if (dbType === "mysql") {
    const mysql = require("mysql2/promise");
    const conn = await mysql.createConnection({
      host: config.host,
      port: parseInt(config.port, 10),
      user: config.user,
      password: config.password,
      database: config.database || undefined,
    });
    await conn.ping();
    await conn.end();
  } else if (dbType === "postgres") {
    const { Client } = require("pg");
    const client = new Client({
      host: config.host,
      port: parseInt(config.port, 10),
      user: config.user,
      password: config.password,
      database: config.database || undefined,
    });
    await client.connect();
    await client.end();
  } else if (dbType === "mongodb") {
    const { MongoClient } = require("mongodb");
    const uri = config.uri || `mongodb://${config.host}:${config.port}`;
    const client = new MongoClient(uri);
    await client.connect();
    await client.close();
  }
}

// ─── Helper: Detect Table Columns ─────────────────────────────
async function detectTableColumns(
  dbType: string,
  config: { host: string; port: string; user: string; password: string; database: string; uri: string },
  tableName: string
): Promise<string[]> {
  if (dbType === "mysql") {
    const mysql = require("mysql2/promise");
    const conn = await mysql.createConnection({
      host: config.host,
      port: parseInt(config.port, 10),
      user: config.user,
      password: config.password,
      database: config.database,
    });
    const [rows] = await conn.query(`SHOW COLUMNS FROM \`${tableName}\``);
    await conn.end();
    return (rows as any[]).map((r: any) => r.Field);
  } else if (dbType === "postgres") {
    const { Client } = require("pg");
    const client = new Client({
      host: config.host,
      port: parseInt(config.port, 10),
      user: config.user,
      password: config.password,
      database: config.database,
    });
    await client.connect();
    const res = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
      [tableName]
    );
    await client.end();
    return res.rows.map((r: any) => r.column_name);
  } else {
    const { MongoClient } = require("mongodb");
    const uri = config.uri || `mongodb://${config.host}:${config.port}`;
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(config.database);
    const doc = await db.collection(tableName).findOne();
    await client.close();
    return doc ? Object.keys(doc) : [];
  }
}

// ─── Helper: Validate Telegram Bot ────────────────────────────
async function validateTelegramBot(token: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const https = require("https");
    https
      .get(`https://api.telegram.org/bot${token}/getMe`, (res: any) => {
        let data = "";
        res.on("data", (chunk: string) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.ok) {
              resolve(parsed.result.username);
            } else {
              reject(new Error(parsed.description));
            }
          } catch {
            reject(new Error("Invalid response"));
          }
        });
      })
      .on("error", reject);
  });
}
