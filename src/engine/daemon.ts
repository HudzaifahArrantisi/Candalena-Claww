// src/engine/daemon.ts
// ─── Candalena Claw — Standalone Background Daemon ───
// Two independent cron cycles:
//   PHASE 1: Real-time new-task scanner  (every 1 minute)
//   PHASE 2: Daily deadline reminder     (configurable, default 07:00)
//
// No OpenClaw dependency. Uses node-cron, direct DB adapters, Telegram Bot API.

import dotenv from "dotenv";
dotenv.config();

import cron from "node-cron";
import https from "https";
import { createAdapter, getAdapter } from "../adapters/adapter.factory";
import { SchemaMapping, Assignment } from "../adapters/adapter.interface";
import { parseDatabaseUrl } from "../lib/db-url-parser";

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
// Telegram Sender (zero-dependency, raw HTTPS)
// ═══════════════════════════════════════════

async function sendTelegram(chatId: string, message: string): Promise<boolean> {
  const token = CONFIG.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("[Candalena] ❌ TELEGRAM_BOT_TOKEN not set!");
    return false;
  }

  const body = JSON.stringify({
    chat_id: chatId,
    text: message,
    parse_mode: "HTML",
  });

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: "api.telegram.org",
        path: `/bot${token}/sendMessage`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (!parsed.ok) {
              console.error(`[Telegram] API error: ${parsed.description}`);
              resolve(false);
            } else {
              resolve(true);
            }
          } catch {
            console.error("[Telegram] Failed to parse response");
            resolve(false);
          }
        });
      }
    );
    req.on("error", (err) => {
      console.error(`[Telegram] Network error: ${err.message}`);
      resolve(false);
    });
    req.write(body);
    req.end();
  });
}

// Send to all configured targets
async function broadcastTelegram(message: string): Promise<void> {
  const targets = CONFIG.TELEGRAM_TARGETS
    ? CONFIG.TELEGRAM_TARGETS.split(",").map(t => t.trim()).filter(Boolean)
    : CONFIG.TELEGRAM_CHAT_ID
      ? [CONFIG.TELEGRAM_CHAT_ID]
      : [];

  if (targets.length === 0) {
    console.warn("[Candalena] ⚠️ No Telegram targets configured.");
    return;
  }

  for (const chatId of targets) {
    const ok = await sendTelegram(chatId, message);
    if (ok) {
      console.log(`[Candalena] ✅ Sent → ${chatId}`);
    } else {
      console.error(`[Candalena] ❌ Failed → ${chatId}`);
    }
  }
}

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
// Message Formatters
// ═══════════════════════════════════════════

function formatNewTaskMessage(task: Assignment): string {
  const courseName = courseMap.get(task.course as string) || task.course;

  const lines = [
    `📢 <b>PEMBERITAHUAN TUGAS BARU</b>`,
    `─────────────────────────`,
    `📖 <b>Mata Kuliah:</b> ${courseName}`,
    `📝 <b>Judul Tugas:</b> ${task.title}`,
  ];

  if (task.lecturer)  lines.push(`👨‍🏫 <b>Dosen:</b> ${task.lecturer}`);
  if (task.kelas && task.semester) {
    lines.push(`🏫 <b>Kelas:</b> ${task.kelas} — Semester ${task.semester}`);
  } else if (task.kelas) {
    lines.push(`🏫 <b>Kelas:</b> ${task.kelas}`);
  }
  if (task.deadline) {
    try {
      const dl = new Date(task.deadline as string);
      const dlStr = dl.toLocaleString("id-ID", {
        timeZone: CONFIG.TZ,
        dateStyle: "full",
        timeStyle: "short",
      });
      lines.push(`📅 <b>Batas Waktu:</b> ${dlStr}`);
    } catch { /* skip if parse fails */ }
  }

  lines.push(``);
  lines.push(`Mohon segera memeriksa sistem akademik untuk detail lebih lanjut.`);
  lines.push(`─────────────────────────`);

  return lines.join("\n");
}

function formatDeadlineMessage(task: Assignment, daysLeft: number): string {
  const courseName = courseMap.get(task.course as string) || task.course;

  let urgency: string;
  if (daysLeft === 0)      urgency = "🔴 HARI INI! DEADLINE!";
  else if (daysLeft === 1) urgency = "🟡 BESOK! H-1";
  else if (daysLeft === 2) urgency = "🟠 H-2";
  else                     urgency = `🟢 H-${daysLeft}`;

  const lines = [
    `⏰ <b>PENGINGAT BATAS WAKTU TUGAS</b>`,
    `─────────────────────────`,
    urgency,
    `📖 <b>Mata Kuliah:</b> ${courseName}`,
    `📝 <b>Judul Tugas:</b> ${task.title}`,
  ];

  if (task.lecturer)  lines.push(`👨‍🏫 <b>Dosen:</b> ${task.lecturer}`);
  if (task.kelas && task.semester) {
    lines.push(`🏫 <b>Kelas:</b> ${task.kelas} — Semester ${task.semester}`);
  } else if (task.kelas) {
    lines.push(`🏫 <b>Kelas:</b> ${task.kelas}`);
  }
  if (task.deadline) {
    try {
      const dl = new Date(task.deadline as string);
      const dlStr = dl.toLocaleString("id-ID", {
        timeZone: CONFIG.TZ,
        dateStyle: "full",
        timeStyle: "short",
      });
      lines.push(`📅 <b>Batas Waktu:</b> ${dlStr}`);
    } catch { /* skip if parse fails */ }
  }

  lines.push(``);
  lines.push(`Diharapkan untuk segera menyelesaikan tugas sebelum batas waktu berakhir.`);
  lines.push(`─────────────────────────`);

  return lines.join("\n");
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

      // Format and broadcast the message
      const message = formatNewTaskMessage(task);
      await broadcastTelegram(message);

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

      await broadcastTelegram(message);
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
  console.log("╔═══════════════════════════════════════════════╗");
  console.log("║  🦞 Candalena Claw — Reminder Daemon v4.0.0   ║");
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

  // ── Connect to database & detect schema ──
  console.log("[Candalena] Connecting to database...");
  const adapter = createAdapter();
  await adapter.testConnection();

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
  console.log(`│  📡 Telegram: ${targets.padEnd(30)}│`);
  console.log(`│  🔄 New task scan:  ${CONFIG.CRON_NEW_TASK.padEnd(24)}│`);
  console.log(`│  📅 Deadline scan:  ${CONFIG.CRON_DEADLINE.padEnd(24)}│`);
  console.log(`│  ⏰ Remind days:    H-${remindDays.join(", H-").padEnd(21)}│`);
  console.log(`│  🌍 Timezone:       ${CONFIG.TZ.padEnd(24)}│`);
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

  console.log("");
  console.log("[Candalena] ✅ Daemon is running. Monitoring database for new tasks...");
  console.log("[Candalena] Press Ctrl+C to stop.\n");

  // ── Run initial deadline check on boot ──
  console.log("[Candalena] Running initial deadline check...");
  await scanDeadlines();
  console.log("");
}

// Start the daemon
boot().catch((err) => {
  console.error("[Candalena] ❌ Fatal error:", err.message);
  process.exit(1);
});
