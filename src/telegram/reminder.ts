// src/telegram/reminder.ts
import { sendTelegramMessage } from "./bot";
import { formatReminderMessage } from "./formatter";
import { ENV } from "../config/env";
import { scanAssignments, markNotified } from "../core/engine";
import { getDeadlineTasks, formatDeadlineMessage } from "../core/deadline";

/**
 * Main reminder pipeline:
 * 1. Scan new assignments → send notification → mark as notified
 * 2. Scan upcoming deadlines → send deadline reminder
 */
export async function scanAndNotify(): Promise<void> {
  const botToken = ENV.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error("[Candalena] ❌ TELEGRAM_BOT_TOKEN not set in .env!");
    return;
  }

  // ── Phase 1: New assignment notifications ──
  await notifyNewAssignments(botToken);

  // ── Phase 2: Deadline reminders ──
  await notifyDeadlines(botToken);
}

async function notifyNewAssignments(botToken: string): Promise<void> {
  console.log("[Candalena] Scanning for new assignments...");

  const tasks = await scanAssignments();

  if (tasks.length === 0) {
    console.log("[Candalena] No new assignments.");
    return;
  }

  console.log(`[Candalena] Found ${tasks.length} new assignment(s).`);
  const notifiedIds: (string | number)[] = [];

  for (const task of tasks) {
    if (!task.telegram_channel) {
      console.warn(`[Candalena] ⚠️  No channel for: "${task.title}"`);
      continue;
    }

    const message = formatReminderMessage(task);
    const success = await sendTelegramMessage(botToken, task.telegram_channel, message);

    if (success) {
      console.log(`[Candalena] ✅ Sent: "${task.title}" → ${task.telegram_channel}`);
      notifiedIds.push(task.id);
    } else {
      console.error(`[Candalena] ❌ Failed: "${task.title}" → ${task.telegram_channel}`);
    }
  }

  await markNotified(notifiedIds);
}

async function notifyDeadlines(botToken: string): Promise<void> {
  try {
    const deadlineTasks = await getDeadlineTasks();

    if (deadlineTasks.length === 0) return;

    console.log(`[Candalena] 📅 ${deadlineTasks.length} deadline reminder(s).`);

    for (const { task, daysLeft } of deadlineTasks) {
      if (!task.telegram_channel) continue;

      const message = formatDeadlineMessage(task, daysLeft);
      const success = await sendTelegramMessage(botToken, task.telegram_channel, message);

      if (success) {
        console.log(`[Candalena] ⏰ Deadline H-${daysLeft}: "${task.title}" → ${task.telegram_channel}`);
      }
    }
  } catch (err: any) {
    // Deadline check is optional — don't crash if deadline column doesn't exist
    console.log("[Candalena] ℹ️  Deadline check skipped (no deadline column or data).");
  }
}