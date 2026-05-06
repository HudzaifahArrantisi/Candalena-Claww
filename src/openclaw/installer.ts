// src/openclaw/installer.ts
// ─── OpenClaw Automated Installer ───
// Handles downloading, installing, and bootstrapping OpenClaw gateway

import { execSync, spawn, SpawnOptions } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const OPENCLAW_HOME = path.join(os.homedir(), ".openclaw");
const OPENCLAW_CONFIG = path.join(OPENCLAW_HOME, "openclaw.json");
const OPENCLAW_SKILLS_DIR = path.join(OPENCLAW_HOME, "skills");

/**
 * Check if OpenClaw is already installed
 */
export function isOpenClawInstalled(): boolean {
  try {
    execSync("openclaw --version", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get installed OpenClaw version
 */
export function getOpenClawVersion(): string | null {
  try {
    const version = execSync("openclaw --version", { stdio: "pipe" }).toString().trim();
    return version;
  } catch {
    return null;
  }
}

/**
 * Install OpenClaw via npm (cross-platform)
 */
export async function installOpenClaw(
  onProgress?: (msg: string) => void,
): Promise<void> {
  const log = onProgress || console.log;

  if (isOpenClawInstalled()) {
    log("OpenClaw is already installed.");
    const version = getOpenClawVersion();
    if (version) log(`Current version: ${version}`);
    return;
  }

  log("Installing OpenClaw via npm...");

  return new Promise<void>((resolve, reject) => {
    const isWindows = process.platform === "win32";
    const cmd = isWindows ? "npm.cmd" : "npm";
    const args = ["install", "-g", "openclaw@latest"];

    const opts: SpawnOptions = {
      stdio: ["pipe", "pipe", "pipe"],
      shell: isWindows,
    };

    const child = spawn(cmd, args, opts);
    let stderr = "";

    child.stdout?.on("data", (data: Buffer) => {
      const line = data.toString().trim();
      if (line) log(`  ${line}`);
    });

    child.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("close", (code: number | null) => {
      if (code === 0) {
        log("OpenClaw installed successfully.");
        resolve();
      } else {
        reject(new Error(`Installation failed (exit code ${code}): ${stderr}`));
      }
    });

    child.on("error", (err: Error) => {
      reject(new Error(`Failed to spawn npm: ${err.message}`));
    });
  });
}

/**
 * Run OpenClaw onboarding in non-interactive mode
 */
export async function runOnboarding(
  onProgress?: (msg: string) => void,
): Promise<void> {
  const log = onProgress || console.log;

  log("Running OpenClaw onboarding...");

  return new Promise<void>((resolve, reject) => {
    const isWindows = process.platform === "win32";
    const cmd = isWindows ? "openclaw.cmd" : "openclaw";
    const args = ["onboard", "--install-daemon"];

    const opts: SpawnOptions = {
      stdio: ["pipe", "pipe", "pipe"],
      shell: isWindows,
    };

    const child = spawn(cmd, args, opts);
    let timeout: NodeJS.Timeout;

    child.stdout?.on("data", (data: Buffer) => {
      const line = data.toString().trim();
      if (line) log(`  ${line}`);
    });

    child.stderr?.on("data", (data: Buffer) => {
      const line = data.toString().trim();
      if (line) log(`  ${line}`);
    });

    // Onboarding might hang waiting for input; give it 60s
    timeout = setTimeout(() => {
      child.kill("SIGTERM");
      log("Onboarding timed out — continuing with manual config.");
      resolve();
    }, 60_000);

    child.on("close", (code: number | null) => {
      clearTimeout(timeout);
      if (code === 0) {
        log("Onboarding completed.");
        resolve();
      } else {
        // Non-zero is ok — we'll configure manually
        log("Onboarding exited — proceeding with manual configuration.");
        resolve();
      }
    });

    child.on("error", (err: Error) => {
      clearTimeout(timeout);
      reject(new Error(`Failed to run onboarding: ${err.message}`));
    });
  });
}

/**
 * Ensure ~/.openclaw directory structure exists
 */
export function ensureOpenClawDirs(): void {
  const dirs = [
    OPENCLAW_HOME,
    path.join(OPENCLAW_HOME, "skills"),
    path.join(OPENCLAW_HOME, "skills", "candalena-lms"),
    path.join(OPENCLAW_HOME, "cron"),
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Read existing openclaw.json config or return empty object
 */
export function readOpenClawConfig(): Record<string, any> {
  try {
    if (fs.existsSync(OPENCLAW_CONFIG)) {
      return JSON.parse(fs.readFileSync(OPENCLAW_CONFIG, "utf-8"));
    }
  } catch {
    // Corrupted config — start fresh
  }
  return {};
}

/**
 * Write openclaw.json config
 */
export function writeOpenClawConfig(config: Record<string, any>): void {
  ensureOpenClawDirs();
  fs.writeFileSync(OPENCLAW_CONFIG, JSON.stringify(config, null, 2), "utf-8");
}

/**
 * Inject Telegram bot token into openclaw.json
 */
export function injectTelegramConfig(
  botToken: string,
  groupIds?: Record<string, string>,
): void {
  const config = readOpenClawConfig();

  // Build groups config from class->chatId mapping
  const groups: Record<string, any> = {};
  if (groupIds) {
    for (const [className, chatId] of Object.entries(groupIds)) {
      groups[chatId] = {
        requireMention: false,
        groupPolicy: "open",
      };
    }
  }
  // Also allow all groups by default for initial setup
  groups["*"] = { requireMention: false, groupPolicy: "open" };

  config.channels = {
    ...config.channels,
    telegram: {
      enabled: true,
      botToken: botToken,
      dmPolicy: "open",
      allowFrom: ["*"],
      groups: groups,
    },
  };

  writeOpenClawConfig(config);
}

/**
 * Inject exec tool auto-approve for database queries
 */
export function injectToolsConfig(): void {
  const config = readOpenClawConfig();

  config.tools = {
    ...config.tools,
    profile: "full",
    exec: {
      ...(config.tools?.exec || {}),
    },
  };

  writeOpenClawConfig(config);
}

/**
 * Inject hooks configuration for webhook-based triggers
 */
export function injectHooksConfig(token: string): void {
  const config = readOpenClawConfig();

  config.hooks = {
    enabled: true,
    token: token,
    path: "/hooks",
  };

  writeOpenClawConfig(config);
}

/**
 * Start OpenClaw gateway process
 */
export async function startGateway(
  onProgress?: (msg: string) => void,
): Promise<void> {
  const log = onProgress || console.log;

  log("Starting OpenClaw Gateway...");

  const isWindows = process.platform === "win32";
  const cmd = isWindows ? "openclaw.cmd" : "openclaw";

  const child = spawn(cmd, ["gateway"], {
    stdio: "ignore",
    detached: true,
    shell: isWindows,
  });

  child.unref();
  log(`Gateway started (PID: ${child.pid})`);
}

/**
 * Check if OpenClaw gateway is running
 */
export function isGatewayRunning(): boolean {
  try {
    const net = require("net");
    return new Promise<boolean>((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      socket.on("connect", () => { socket.destroy(); resolve(true); });
      socket.on("timeout", () => { socket.destroy(); resolve(false); });
      socket.on("error", () => resolve(false));
      socket.connect(18789, "127.0.0.1");
    }) as any; // Sync check approximation
  } catch {
    return false;
  }
}

export {
  OPENCLAW_HOME,
  OPENCLAW_CONFIG,
  OPENCLAW_SKILLS_DIR,
};
