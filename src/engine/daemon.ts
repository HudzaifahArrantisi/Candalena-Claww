// src/engine/daemon.ts
// ─── Candalena Claw v5.0 — Standalone Background Daemon ───
// Two independent cron cycles:
//   PHASE 1: Real-time new-task scanner  (every 1 minute)
//   PHASE 2: Daily deadline reminder     (configurable, default 07:00)
//
// v5.0 Upgrades:
//   • INotifier adapter pattern (multi-channel ready)
//   • Dynamic message templates via .env
//   • Admin error alerting (DM to admin on crash/errors)
//   • Interactive bot listener (/tugas, /help)
//   • Lightweight web dashboard (optional)
//
// No OpenClaw dependency. Uses node-cron, direct DB adapters.

import dotenv from "dotenv";
dotenv.config();

import cron from "node-cron";
import { createAdapter, getAdapter } from "../adapters/adapter.factory";
import { SchemaMapping, Assignment } from "../adapters/adapter.interface";
import { parseDatabaseUrl } from "../lib/db-url-parser";

// ── v5.0 Imports ──
import { createNotifiers, broadcastAll } from "../notifiers/notifier.factory";
import { renderTemplate, DEFAULT_NEW_TASK_TEMPLATE, DEFAULT_DEADLINE_TEMPLATE } from "../templates/template-engine";
import { initAdminAlert, installGlobalErrorHandlers, alertAdmin } from "../alerts/admin-alert";
import { BotListener } from "../bot/bot-listener";
import { installLogInterceptor } from "../dashboard/log-buffer";
import { startDashboard } from "../dashboard/dashboard.server";

// ═══════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════

const CONFIG = {
  // Telegram
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || "",
  TELEGRAM_TARGETS: process.env.TELEGRAM_TARGETS || "",

  // Scheduler
  CRON_NEW_TASK: process.env.CRON_NEW_TASK || "* * * * *",          // every 1 minute
  CRON_DEADLINE: process.env.CRON_DEADLINE || "0 7 * * *",          // daily 07:00
  DEADLINE_REMIND_DAYS: process.env.DEADLINE_REMIND_DAYS || "3,2,1,0",
  TZ: process.env.TZ || "Asia/Jakarta",

  // Table
  TABLE_NAME: process.env.TABLE_NAME || "tugas",

  // v5.0: Notifier channels
  NOTIFIER_CHANNELS: process.env.NOTIFIER_CHANNELS || "telegram",

  // v5.0: Admin alerting
  ADMIN_TELEGRAM_ID: process.env.ADMIN_TELEGRAM_ID || "",

  // v5.0: Message templates
  MSG_TEMPLATE_NEW_TASK: process.env.MSG_TEMPLATE_NEW_TASK || "",
  MSG_TEMPLATE_DEADLINE: process.env.MSG_TEMPLATE_DEADLINE || "",

  // v5.0: Interactive bot
  ENABLE_INTERACTIVE_BOT: process.env.ENABLE_INTERACTIVE_BOT === "true",

  // v5.0: Dashboard
  ENABLE_DASHBOARD: process.env.ENABLE_DASHBOARD === "true",
  DASHBOARD_PORT: parseInt(process.env.DASHBOARD_PORT || "9090", 10),
};

// ═══════════════════════════════════════════
// In-Memory State — prevents duplicate notifications
// ═══════════════════════════════════════════

const processedTaskIds = new Set<string | number>();
// Track which (taskId, daysLeft) combos we've already sent deadline reminders for today
const sentDeadlineReminders = new Set<string>();

let cachedSchema: SchemaMapping | null = null;
const courseMap = new Map<string, string>();

// ═══════════════════════════════════════════
// Schema & Adapter helpers
// ═══════════════════════════════════════════

async function getSchema(): Promise<SchemaMapping> {
  if (cachedSchema) return cachedSchema;
  const adapter = getAdapter();
  cachedSchema = await adapter.detectSchema(CONFIG.TABLE_NAME);
  return cachedSchema;
}

// ═══════════════════════════════════════════
// Message Formatters (v5.0: Template-based)
// ═══════════════════════════════════════════

function formatNewTaskMessage(task: Assignment): string {
  const courseValue = task.course && String(task.course).toLowerCase() !== "null" ? task.course : "";
  const courseName = courseMap.get(courseValue as string) || courseValue || "";

  let dlStr = "";
  if (task.deadline) {
    try {
      const dl = new Date(task.deadline as string);
      dlStr = dl.toLocaleString("id-ID", {
        timeZone: CONFIG.TZ,
        dateStyle: "full",
        timeStyle: "short",
      });
    } catch { /* skip if parse fails */ }
  }

  const lecturer = (task.lecturer && String(task.lecturer).toLowerCase() !== "null") ? task.lecturer : "";
  const kelas = (task.kelas && String(task.kelas).toLowerCase() !== "null") ? task.kelas : "";
  const semester = (task.semester && String(task.semester).toLowerCase() !== "null") ? task.semester : "";

  const kelasStr = kelas && semester
    ? `${kelas} — Semester ${semester}`
    : kelas || "";

  // Use custom template from .env or default
  const template = CONFIG.MSG_TEMPLATE_NEW_TASK || DEFAULT_NEW_TASK_TEMPLATE;

  return renderTemplate(template, {
    matkul: courseName,
    judul: task.title,
    dosen: lecturer,
    kelas: kelasStr,
    semester: semester,
    deadline: dlStr,
  });
}

function formatDeadlineMessage(task: Assignment, daysLeft: number): string {
  const courseValue = task.course && String(task.course).toLowerCase() !== "null" ? task.course : "";
  const courseName = courseMap.get(courseValue as string) || courseValue || "";

  let urgency: string;
  if (daysLeft === 0)      urgency = "🔴 HARI INI! DEADLINE!";
  else if (daysLeft === 1) urgency = "🟡 BESOK! H-1";
  else if (daysLeft === 2) urgency = "🟠 H-2";
  else                     urgency = `🟢 H-${daysLeft}`;

  let dlStr = "";
  if (task.deadline) {
    try {
      const dl = new Date(task.deadline as string);
      dlStr = dl.toLocaleString("id-ID", {
        timeZone: CONFIG.TZ,
        dateStyle: "full",
        timeStyle: "short",
      });
    } catch { /* skip if parse fails */ }
  }

  const lecturer = (task.lecturer && String(task.lecturer).toLowerCase() !== "null") ? task.lecturer : "";
  const kelas = (task.kelas && String(task.kelas).toLowerCase() !== "null") ? task.kelas : "";
  const semester = (task.semester && String(task.semester).toLowerCase() !== "null") ? task.semester : "";

  const kelasStr = kelas && semester
    ? `${kelas} — Semester ${semester}`
    : kelas || "";

  // Use custom template from .env or default
  const template = CONFIG.MSG_TEMPLATE_DEADLINE || DEFAULT_DEADLINE_TEMPLATE;

  return renderTemplate(template, {
    matkul: courseName,
    judul: task.title,
    dosen: lecturer,
    kelas: kelasStr,
    semester: semester,
    deadline: dlStr,
    urgency,
    hari: daysLeft,
  });
}

// ═══════════════════════════════════════════
// PHASE 1: REAL-TIME NEW TASK SCANNER
// Runs every 1 minute — detects new rows in DB
// ═══════════════════════════════════════════

async function scanNewTasks(): Promise<void> {
  const timestamp = new Date().toLocaleString("id-ID", { timeZone: CONFIG.TZ, timeStyle: "medium" } as any);

  try {
    const adapter = getAdapter();
    const schema = await getSchema();

    // Query ALL tasks from DB
    const allTasks: any[] = await adapter.queryAll(CONFIG.TABLE_NAME);

    // Find tasks whose ID is NOT in our processedTaskIds set
    const idCol = schema.id;
    const newTasks: any[] = [];

    for (const row of allTasks) {
      const taskId = row[idCol] ?? row.id ?? row._id;
      if (taskId != null && !processedTaskIds.has(taskId)) {
        newTasks.push(row);
      }
    }

    if (newTasks.length === 0) {
      // Silent — no spam in logs for every-minute poll
      return;
    }

    console.log(`\n[Candalena] 🆕 ${newTasks.length} new task(s) detected at ${timestamp}!`);

    for (const row of newTasks) {
      // Map raw row to Assignment using schema mapping
      const task = mapRowToAssignment(row, schema);
      const taskId = row[idCol] ?? row.id ?? row._id;

      // Format and broadcast the message via ALL notifier channels
      const message = formatNewTaskMessage(task);
      await broadcastAll(message);

      console.log(`[Candalena] 📚 New task notified: "${task.title}" (ID: ${taskId})`);

      // Add to processed set so we don't send again
      processedTaskIds.add(taskId);
    }

    // Also try to mark as notified in DB (best-effort, won't fail if column doesn't exist)
    try {
      const ids = newTasks.map(row => row[idCol] ?? row.id ?? row._id).filter(Boolean);
      await adapter.markNotified(CONFIG.TABLE_NAME, schema, ids);
    } catch {
      // Silently ignore — we might not have UPDATE permission on external DB
    }

  } catch (err: any) {
    console.error(`[Candalena] ❌ New task scan error: ${err.message}`);
    await alertAdmin("New Task Scan Error", err.message);
  }
}

// ═══════════════════════════════════════════
// PHASE 2: DAILY DEADLINE REMINDER
// Runs once daily — checks for approaching deadlines
// ═══════════════════════════════════════════

function getRemindDays(): number[] {
  return CONFIG.DEADLINE_REMIND_DAYS
    .split(",")
    .map(d => parseInt(d.trim(), 10))
    .filter(d => !isNaN(d));
}

async function scanDeadlines(): Promise<void> {
  const timestamp = new Date().toLocaleString("id-ID", { timeZone: CONFIG.TZ });
  console.log(`\n[Candalena] 📅 Deadline scan started — ${timestamp}`);

  try {
    const adapter = getAdapter();
    const schema = await getSchema();

    if (!schema.deadline) {
      console.log("[Candalena] ℹ️  No deadline column detected — skipping.");
      return;
    }

    const remindDays = getRemindDays();
    if (remindDays.length === 0) {
      console.log("[Candalena] ℹ️  No DEADLINE_REMIND_DAYS configured — skipping.");
      return;
    }

    // Query all tasks (we filter in-memory for maximum DB compatibility)
    const allTasks: any[] = await adapter.queryAll(CONFIG.TABLE_NAME);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let remindersSent = 0;

    for (const row of allTasks) {
      const deadlineVal = row[schema.deadline!];
      if (!deadlineVal) continue;

      const dl = new Date(deadlineVal);
      dl.setHours(0, 0, 0, 0);
      const diff = Math.round((dl.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (!remindDays.includes(diff)) continue;

      const taskId = row[schema.id] ?? row.id ?? row._id;
      const reminderKey = `${taskId}-H${diff}`;

      // Don't send the same deadline reminder twice in the same day
      if (sentDeadlineReminders.has(reminderKey)) continue;

      const task = mapRowToAssignment(row, schema);
      const message = formatDeadlineMessage(task, diff);

      // v5.0: Broadcast via ALL notifier channels
      await broadcastAll(message);
      sentDeadlineReminders.add(reminderKey);
      remindersSent++;

      console.log(`[Candalena] ⏰ Deadline H-${diff}: "${task.title}" (ID: ${taskId})`);
    }

    if (remindersSent === 0) {
      console.log("[Candalena] ✅ No deadlines approaching today.");
    } else {
      console.log(`[Candalena] 📬 ${remindersSent} deadline reminder(s) sent.`);
    }
  } catch (err: any) {
    console.error(`[Candalena] ❌ Deadline scan error: ${err.message}`);
    await alertAdmin("Deadline Scan Error", err.message);
  }
}

// ═══════════════════════════════════════════
// Utility: Map raw DB row → Assignment object
// ═══════════════════════════════════════════

function mapRowToAssignment(row: any, schema: SchemaMapping): Assignment {
  return {
    id:               row[schema.id] ?? row.id ?? row._id ?? 0,
    title:            row[schema.title] ?? row.title ?? row.judul ?? "(Tanpa Judul)",
    lecturer:         schema.lecturer ? row[schema.lecturer] : null,
    course:           schema.course ? row[schema.course] : null,
    semester:         schema.semester ? row[schema.semester] : null,
    kelas:            schema.kelas ? row[schema.kelas] : null,
    telegram_channel: schema.telegramChannel ? row[schema.telegramChannel] : null,
    deadline:         schema.deadline ? row[schema.deadline] : null,
    notified:         schema.notified ? row[schema.notified] : 0,
  };
}

// ═══════════════════════════════════════════
// DAEMON BOOT
// ═══════════════════════════════════════════

async function boot(): Promise<void> {
  // ── v5.0: Install log interceptor FIRST (for dashboard) ──
  installLogInterceptor();

  // ── v5.0: Install global error handlers & admin alerting ──
  initAdminAlert(CONFIG.TELEGRAM_BOT_TOKEN, CONFIG.ADMIN_TELEGRAM_ID);
  installGlobalErrorHandlers();

  console.log("╔═══════════════════════════════════════════════╗");
  console.log("║  🦞 Candalena Claw — Reminder Daemon v5.0.0   ║");
  console.log("║  Standalone Background Worker                  ║");
  console.log("║  Phase 1: Real-time Task Scanner (every 1 min) ║");
  console.log("║  Phase 2: Daily Deadline Reminder               ║");
  console.log("╚═══════════════════════════════════════════════╝");
  console.log("");

  // ── Validate config ──
  if (!CONFIG.TELEGRAM_BOT_TOKEN) {
    console.error("[Candalena] ❌ TELEGRAM_BOT_TOKEN is not set. Run: candalena-claw install-ai");
    process.exit(1);
  }

  if (!CONFIG.TELEGRAM_CHAT_ID && !CONFIG.TELEGRAM_TARGETS) {
    console.error("[Candalena] ❌ No Telegram targets configured. Run: candalena-claw install-ai");
    process.exit(1);
  }

  // ── v5.0: Initialize notifiers (Adapter Pattern) ──
  const targetsList = CONFIG.TELEGRAM_TARGETS
    ? CONFIG.TELEGRAM_TARGETS.split(",").map(t => t.trim()).filter(Boolean)
    : CONFIG.TELEGRAM_CHAT_ID
      ? [CONFIG.TELEGRAM_CHAT_ID]
      : [];

  createNotifiers({
    channels: CONFIG.NOTIFIER_CHANNELS,
    telegramToken: CONFIG.TELEGRAM_BOT_TOKEN,
    telegramTargets: targetsList,
  });

  // ── Connect to database & detect schema ──
  console.log("[Candalena] Connecting to database...");

  let adapter;
  try {
    adapter = createAdapter();
    await adapter.testConnection();
  } catch (err: any) {
    console.error(`[Candalena] ❌ Database connection failed: ${err.message}`);
    await alertAdmin("Database Connection Failed", err.message);
    process.exit(1);
  }

  const schema = await adapter.detectSchema(CONFIG.TABLE_NAME);
  cachedSchema = schema;
  console.log(`[Candalena] ✅ Schema detected for table '${CONFIG.TABLE_NAME}':`);
  console.log(`  ID:       ${schema.id}`);
  console.log(`  Title:    ${schema.title}`);
  console.log(`  Deadline: ${schema.deadline || "(not found)"}`);
  console.log(`  Course:   ${schema.course || "(not found)"}`);
  console.log(`  Lecturer: ${schema.lecturer || "(not found)"}`);
  console.log(`  Kelas:    ${schema.kelas || "(not found)"}`);
  console.log(`  Notified: ${schema.notified}`);
  console.log(`  Telegram: ${schema.telegramChannel || "(not found)"}`);
  console.log("");

  // ── Pre-load course names ──
  try {
    const courses = await adapter.queryAll("mata_kuliah");
    for (const c of courses) {
      if (c.kode && c.nama) courseMap.set(c.kode, c.nama);
    }
    console.log(`[Candalena] ✅ Loaded ${courseMap.size} courses into memory map.`);
  } catch (err: any) {
    console.warn(`[Candalena] ⚠️ Could not load mata_kuliah: ${err.message}`);
  }

  // ── Pre-load existing tasks into processedTaskIds ──
  // This prevents sending "TUGAS BARU" for old tasks when the daemon restarts.
  console.log("[Candalena] Loading existing tasks into memory cache...");
  try {
    const existingTasks = await adapter.queryAll(CONFIG.TABLE_NAME);
    for (const row of existingTasks) {
      const taskId = row[schema.id] ?? row.id ?? row._id;
      if (taskId != null) {
        processedTaskIds.add(taskId);
      }
    }
    console.log(`[Candalena] ✅ Cached ${processedTaskIds.size} existing task(s). They will NOT be re-notified.`);
  } catch (err: any) {
    console.warn(`[Candalena] ⚠️ Could not pre-load tasks: ${err.message}`);
    console.warn("[Candalena]    New task notifications will start from scratch.");
  }

  console.log("");

  // ── Print config summary ──
  const remindDays = getRemindDays();
  const targets = CONFIG.TELEGRAM_TARGETS || CONFIG.TELEGRAM_CHAT_ID;
  console.log("┌─────────────────────────────────────────────┐");
  console.log("│  Daemon Configuration                       │");
  console.log("├─────────────────────────────────────────────┤");
  console.log(`│  Channels: ${CONFIG.NOTIFIER_CHANNELS.padEnd(29)}│`);
  console.log(`│  Telegram: ${targets.padEnd(30)}│`);
  console.log(`│  New task scan:  ${CONFIG.CRON_NEW_TASK.padEnd(24)}│`);
  console.log(`│  Deadline scan:  ${CONFIG.CRON_DEADLINE.padEnd(24)}│`);
  console.log(`│  Remind days:    H-${remindDays.join(", H-").padEnd(21)}│`);
  console.log(`│  Timezone:       ${CONFIG.TZ.padEnd(24)}│`);
  console.log(`│  Bot:            ${(CONFIG.ENABLE_INTERACTIVE_BOT ? "Active" : "Disabled").padEnd(24)}│`);
  console.log(`│  Dashboard:      ${(CONFIG.ENABLE_DASHBOARD ? `Port ${CONFIG.DASHBOARD_PORT}` : "Disabled").padEnd(24)}│`);
  console.log(`│  Admin alerts:   ${(CONFIG.ADMIN_TELEGRAM_ID ? "Enabled" : "Disabled").padEnd(24)}│`);
  console.log("└─────────────────────────────────────────────┘");
  console.log("");

  // ── Validate cron expressions ──
  if (!cron.validate(CONFIG.CRON_NEW_TASK)) {
    console.error(`[Candalena] ❌ Invalid CRON_NEW_TASK: ${CONFIG.CRON_NEW_TASK}`);
    process.exit(1);
  }
  if (!cron.validate(CONFIG.CRON_DEADLINE)) {
    console.error(`[Candalena] ❌ Invalid CRON_DEADLINE: ${CONFIG.CRON_DEADLINE}`);
    process.exit(1);
  }

  // ═══ START PHASE 1: Real-time New Task Scanner ═══
  cron.schedule(CONFIG.CRON_NEW_TASK, async () => {
    await scanNewTasks();
  }, {
    timezone: CONFIG.TZ,
  });
  console.log(`[Candalena] 🔄 PHASE 1 active — New task scanner (${CONFIG.CRON_NEW_TASK})`);

  // ═══ START PHASE 2: Daily Deadline Reminder ═══
  cron.schedule(CONFIG.CRON_DEADLINE, async () => {
    // Reset daily deadline cache each morning
    sentDeadlineReminders.clear();
    await scanDeadlines();
  }, {
    timezone: CONFIG.TZ,
  });
  console.log(`[Candalena] 📅 PHASE 2 active — Deadline reminder (${CONFIG.CRON_DEADLINE})`);

  // ═══ v5.0: START INTERACTIVE BOT LISTENER ═══
  if (CONFIG.ENABLE_INTERACTIVE_BOT) {
    const botListener = new BotListener(CONFIG.TELEGRAM_BOT_TOKEN, CONFIG.TABLE_NAME, CONFIG.TZ);
    botListener.start(); // Non-blocking, runs in background
  } else {
    console.log("[Candalena] 🤖 Interactive bot: disabled (set ENABLE_INTERACTIVE_BOT=true to enable)");
  }

  // ═══ v5.0: START WEB DASHBOARD ═══
  if (CONFIG.ENABLE_DASHBOARD) {
    startDashboard(CONFIG.DASHBOARD_PORT, {
      targets,
      cronNewTask: CONFIG.CRON_NEW_TASK,
      cronDeadline: CONFIG.CRON_DEADLINE,
      timezone: CONFIG.TZ,
      tableName: CONFIG.TABLE_NAME,
      dbType: process.env.DB_TYPE || "unknown",
      botActive: CONFIG.ENABLE_INTERACTIVE_BOT,
      remindDays: CONFIG.DEADLINE_REMIND_DAYS,
      version: "5.0.0",
    });
  } else {
    console.log("[Candalena] 📊 Dashboard: disabled (set ENABLE_DASHBOARD=true to enable)");
  }

  console.log("");
  console.log("[Candalena] ✅ Daemon is running. Monitoring database for new tasks...");
  console.log("[Candalena] Press Ctrl+C to stop.\n");

  // ── Run initial deadline check on boot ──
  console.log("[Candalena] Running initial deadline check...");
  await scanDeadlines();
  console.log("");
}

// Start the daemon
boot().catch(async (err) => {
  console.error("[Candalena] ❌ Fatal error:", err.message);
  await alertAdmin("Fatal Boot Error", err.message);
  process.exit(1);
});
