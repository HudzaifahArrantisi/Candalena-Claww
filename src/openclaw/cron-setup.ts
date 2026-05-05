// src/openclaw/cron-setup.ts
// ─── OpenClaw Cron Job Setup ───
// Configures scheduled tasks for 24/7 database monitoring

import { execSync } from "child_process";
import { buildCronJobMessage } from "./ai-prompt";

/**
 * Create OpenClaw cron job for periodic database monitoring
 */
export async function createMonitoringCronJob(
  interval: "1min" | "5min" | "15min" | "30min" | "1hr",
  timezone: string,
  telegramChatId: string,
  onProgress?: (msg: string) => void,
): Promise<void> {
  const log = onProgress || console.log;

  const cronMap: Record<string, string> = {
    "1min": "* * * * *",
    "5min": "*/5 * * * *",
    "15min": "*/15 * * * *",
    "30min": "*/30 * * * *",
    "1hr": "0 * * * *",
  };

  const cronExpr = cronMap[interval] || "*/5 * * * *";
  const message = buildCronJobMessage();

  const isWindows = process.platform === "win32";
  const openclaw = isWindows ? "openclaw.cmd" : "openclaw";

  // Build the cron add command
  const args = [
    "cron", "add",
    "--name", '"Candalena LMS Monitor"',
    "--cron", `"${cronExpr}"`,
    "--tz", `"${timezone}"`,
    "--session", "isolated",
    "--message", `"${message.replace(/"/g, '\\"')}"`,
    "--announce",
    "--channel", "telegram",
    "--to", `"${telegramChatId}"`,
    "--tools", "exec,read,write",
  ];

  const command = `${openclaw} ${args.join(" ")}`;

  log(`Creating cron job with schedule: ${cronExpr} (${timezone})`);

  try {
    execSync(command, { stdio: "pipe", timeout: 30_000 });
    log("Cron job created successfully.");
  } catch (err: any) {
    log(`Warning: Could not create cron job automatically.`);
    log(`You can create it manually with:`);
    log("");
    log(`  openclaw cron add \\`);
    log(`    --name "Candalena LMS Monitor" \\`);
    log(`    --cron "${cronExpr}" \\`);
    log(`    --tz "${timezone}" \\`);
    log(`    --session isolated \\`);
    log(`    --message "${message.substring(0, 100)}..." \\`);
    log(`    --announce \\`);
    log(`    --channel telegram \\`);
    log(`    --to "${telegramChatId}" \\`);
    log(`    --tools exec,read,write`);
    log("");
  }
}

/**
 * Create deadline-specific cron jobs for morning and evening checks
 */
export async function createDeadlineCronJobs(
  timezone: string,
  telegramChatId: string,
  onProgress?: (msg: string) => void,
): Promise<void> {
  const log = onProgress || console.log;
  const isWindows = process.platform === "win32";
  const openclaw = isWindows ? "openclaw.cmd" : "openclaw";

  const jobs = [
    {
      name: "Candalena Morning Check",
      cron: "0 7 * * *",
      message: "Morning deadline check: Find all assignments due today (H-0), tomorrow (H-1), and in 3 days (H-3). Send appropriate reminders with urgency levels. Follow candalena-lms skill instructions.",
    },
    {
      name: "Candalena Evening Check",
      cron: "0 20 * * *",
      message: "Evening deadline check: Find all assignments due tomorrow (H-1) and today (H-0). Send urgent final reminders. Follow candalena-lms skill instructions.",
    },
    {
      name: "Candalena New Task Check",
      cron: "*/15 * * * *",
      message: "New task detection: Check for any new assignments that haven't been announced yet. Notify the relevant class groups immediately. Follow candalena-lms skill instructions.",
    },
  ];

    for (const job of jobs) {
      const command = [
        openclaw, "cron", "add",
        "--name", `"${job.name}"`,
        "--cron", `"${job.cron}"`,
        "--tz", `"${timezone}"`,
        "--session", "isolated",
        "--message", `"${job.message.replace(/"/g, '\\"')}"`,
        "--announce",
        "--channel", "telegram",
        "--to", `"${telegramChatId}"`,
        "--tools", "exec,read,write",
      ].join(" ");

      try {
        execSync(command, { stdio: "pipe", timeout: 30_000 });
        log(`  ✔ Created: ${job.name} (${job.cron})`);
      } catch {
        log(`\n  ⚠ Could not create: ${job.name} automatically.`);
        log(`  Please copy and paste the following command into a NEW terminal window:`);
        log(`\n    ${command}\n`);
        
        // Wait for user to press enter
        const inquirer = require("inquirer");
        await inquirer.prompt([
          {
            type: "input",
            name: "continue",
            message: "Press ENTER after you have successfully run the command above in a separate terminal...",
          }
        ]);
      }
    }
}

/**
 * List existing cron jobs
 */
export function listCronJobs(): string {
  try {
    const isWindows = process.platform === "win32";
    const openclaw = isWindows ? "openclaw.cmd" : "openclaw";
    return execSync(`${openclaw} cron list`, { stdio: "pipe" }).toString();
  } catch {
    return "(Could not list cron jobs — is OpenClaw gateway running?)";
  }
}
