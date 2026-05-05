// src/cli/ui.ts
// ─── Candalena Claw — CLI UI Utilities ───
// Shared formatting, colors, spinners, and layout primitives

import chalk from "chalk";
import boxen from "boxen";
import ora, { Ora } from "ora";
import Table from "cli-table3";

// ─── Brand Colors ──────────────────────────────────────────────
export const brand = {
  primary: chalk.hex("#7C3AED"),     // vivid purple
  secondary: chalk.hex("#06B6D4"),   // cyan
  success: chalk.hex("#10B981"),     // emerald
  warning: chalk.hex("#F59E0B"),     // amber
  error: chalk.hex("#EF4444"),       // red
  dim: chalk.gray,
  muted: chalk.hex("#6B7280"),
  white: chalk.white,
  bold: chalk.bold,
  highlight: chalk.hex("#A78BFA"),   // light purple
};

// ─── Status Icons ──────────────────────────────────────────────
export const icon = {
  ok: brand.success("✔"),
  warn: brand.warning("⚠"),
  fail: brand.error("✖"),
  info: brand.secondary("ℹ"),
  arrow: brand.primary("›"),
  dot: brand.muted("·"),
  rocket: "🚀",
  gear: "⚙",
  check: "✅",
  cross: "❌",
  sparkle: "✨",
  package: "📦",
  plug: "🔌",
  bot: "🤖",
  clock: "🕐",
  shield: "🛡",
  key: "🔑",
  db: "🗄",
  link: "🔗",
  folder: "📁",
  file: "📄",
};

// ─── Header / Banner ──────────────────────────────────────────
export function printBanner(): void {
  const banner = boxen(
    brand.primary.bold("Candalena Claw") +
      brand.dim("  v" + getVersion()) +
      "\n" +
      brand.muted("Universal LMS Reminder Engine"),
    {
      padding: { top: 0, bottom: 0, left: 2, right: 2 },
      borderColor: "magenta",
      borderStyle: "round",
      dimBorder: false,
    }
  );
  console.log("");
  console.log(banner);
  console.log("");
}

export function printHeader(title: string): void {
  console.log("");
  console.log(brand.primary.bold(`  ${title}`));
  console.log(brand.dim("  " + "─".repeat(50)));
  console.log("");
}

// ─── Sections ─────────────────────────────────────────────────
export function printSection(title: string): void {
  console.log("");
  console.log(brand.bold(`  ${title}`));
  console.log("");
}

export function printStep(num: number, text: string): void {
  console.log(`  ${brand.primary(num + ".")} ${text}`);
}

export function printKeyValue(key: string, value: string, indent = 2): void {
  const pad = " ".repeat(indent);
  console.log(`${pad}${brand.muted(key + ":")} ${value}`);
}

export function printLine(text = "", indent = 2): void {
  console.log(" ".repeat(indent) + text);
}

export function printBlank(): void {
  console.log("");
}

// ─── Status Lines ─────────────────────────────────────────────
export function printOk(text: string): void {
  console.log(`  ${icon.ok} ${text}`);
}

export function printWarn(text: string): void {
  console.log(`  ${icon.warn} ${brand.warning(text)}`);
}

export function printFail(text: string): void {
  console.log(`  ${icon.fail} ${brand.error(text)}`);
}

export function printInfo(text: string): void {
  console.log(`  ${icon.info} ${text}`);
}

// ─── Spinner ──────────────────────────────────────────────────
export function createSpinner(text: string): Ora {
  return ora({
    text: `  ${text}`,
    color: "magenta",
    spinner: "dots",
  });
}

// ─── Tables ───────────────────────────────────────────────────
export function createTable(headers: string[]): Table.Table {
  return new Table({
    head: headers.map((h) => brand.primary.bold(h)),
    chars: {
      top: "─",
      "top-mid": "┬",
      "top-left": "┌",
      "top-right": "┐",
      bottom: "─",
      "bottom-mid": "┴",
      "bottom-left": "└",
      "bottom-right": "┘",
      left: "│",
      "left-mid": "├",
      mid: "─",
      "mid-mid": "┼",
      right: "│",
      "right-mid": "┤",
      middle: "│",
    },
    style: {
      head: [],
      border: ["gray"],
      compact: false,
    },
  });
}

// ─── Boxes ────────────────────────────────────────────────────
export function printBox(content: string, opts?: { borderColor?: string; title?: string }): void {
  console.log(
    boxen(content, {
      padding: { top: 0, bottom: 0, left: 2, right: 2 },
      borderColor: (opts?.borderColor as any) || "gray",
      borderStyle: "round",
      title: opts?.title,
      titleAlignment: "left",
    })
  );
}

// ─── Error Formatter ──────────────────────────────────────────
const ERROR_MAP: Record<string, { message: string; fix: string }> = {
  ECONNREFUSED: {
    message: "Cannot connect to database",
    fix: "Check DB_HOST and DB_PORT in your .env, or start your database server.",
  },
  ENOTFOUND: {
    message: "Database host not found",
    fix: "Verify DB_HOST in your .env is correct.",
  },
  ER_ACCESS_DENIED_ERROR: {
    message: "Database access denied",
    fix: "Check DB_USER and DB_PASS in your .env.",
  },
  ER_BAD_DB_ERROR: {
    message: "Database does not exist",
    fix: "Create the database or update DB_NAME in your .env.",
  },
  ER_NO_SUCH_TABLE: {
    message: "Table not found in database",
    fix: "Create the table or update TABLE_NAME in your .env.",
  },
  ETELEGRAM: {
    message: "Telegram Bot API error",
    fix: "Check TELEGRAM_BOT_TOKEN in your .env. Create a bot via @BotFather.",
  },
  ENOENT: {
    message: "File or directory not found",
    fix: "Run 'candalena-claw init' to create the project structure.",
  },
};

export function formatError(err: Error | any): { message: string; fix: string } {
  const code = err.code || err.errno || "";
  const mapped = ERROR_MAP[code];
  if (mapped) return mapped;

  // Try to match partial codes
  for (const [key, val] of Object.entries(ERROR_MAP)) {
    if (err.message?.includes(key)) return val;
  }

  return {
    message: err.message || "An unexpected error occurred",
    fix: "Run 'candalena-claw doctor' to diagnose the issue.",
  };
}

export function handleError(err: Error | any): void {
  const { message, fix } = formatError(err);
  console.log("");
  printFail(message);
  console.log("");
  printLine(brand.muted("Fix: ") + fix);
  console.log("");
}

// ─── Require Setup Guard ──────────────────────────────────────
import * as fs from "fs";
import * as path from "path";

export function requireSetup(): boolean {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    console.log("");
    printWarn("No configuration detected.");
    console.log("");
    printLine("Run:");
    console.log("");
    printLine(`  ${brand.primary("candalena-claw setup")}`);
    console.log("");
    return false;
  }
  return true;
}

// ─── Version ──────────────────────────────────────────────────
export function getVersion(): string {
  try {
    const pkgPath = path.resolve(__dirname, "../../package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    return pkg.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

// ─── Confirm Prompt ───────────────────────────────────────────
import * as readline from "readline";

export function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(`  ${question} ${brand.muted("(y/n)")} `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}
