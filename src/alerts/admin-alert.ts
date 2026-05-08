// src/alerts/admin-alert.ts
// ─── Candalena Claw v5.0 — Admin Error Alerting System ───
// Sends emergency DM to admin's personal Telegram when critical errors occur.
// Uses direct HTTPS (bypasses INotifier to avoid circular failures).

import https from "https";

let botToken = "";
let adminChatId = "";
let alertsEnabled = false;

// Throttle: don't spam admin with same error type within 60 seconds
const alertCooldown = new Map<string, number>();
const COOLDOWN_MS = 60_000;

/**
 * Initialize the admin alert system.
 * Must be called early in boot() before anything else.
 */
export function initAdminAlert(token: string, adminId: string): void {
  botToken = token;
  adminChatId = adminId;
  alertsEnabled = !!(token && adminId);

  if (alertsEnabled) {
    console.log(`[Candalena] 🔔 Admin alerting enabled → ${adminId}`);
  }
}

/**
 * Send an emergency DM to the admin's personal Telegram.
 * Bypasses the INotifier system to avoid circular errors.
 * Throttled: same subject won't be sent more than once per 60 seconds.
 */
export async function alertAdmin(subject: string, detail: string): Promise<void> {
  if (!alertsEnabled) return;

  // Throttle check
  const now = Date.now();
  const lastSent = alertCooldown.get(subject) || 0;
  if (now - lastSent < COOLDOWN_MS) return;
  alertCooldown.set(subject, now);

  const tz = process.env.TZ || "Asia/Jakarta";
  const timestamp = new Date().toLocaleString("id-ID", { timeZone: tz });

  const message = [
    `🚨 <b>CANDALENA CLAW — ALERT</b>`,
    `─────────────────────────`,
    `⚠️ <b>${escapeHtml(subject)}</b>`,
    ``,
    `<pre>${escapeHtml(detail.substring(0, 500))}</pre>`,
    ``,
    `🕐 ${timestamp}`,
    `─────────────────────────`,
    `<i>Daemon akan mencoba melanjutkan operasi.</i>`,
  ].join("\n");

  const body = JSON.stringify({
    chat_id: adminChatId,
    text: message,
    parse_mode: "HTML",
  });

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: "api.telegram.org",
        path: `/bot${botToken}/sendMessage`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        res.on("data", () => {});
        res.on("end", () => resolve());
      }
    );
    req.on("error", () => resolve()); // Silently fail — we can't alert about alert failures
    req.write(body);
    req.end();
  });
}

/**
 * Install global uncaughtException and unhandledRejection handlers.
 * These will alert the admin before the process exits or continues.
 */
export function installGlobalErrorHandlers(): void {
  process.on("uncaughtException", async (err) => {
    console.error("[Candalena] 💀 UNCAUGHT EXCEPTION:", err.message);
    console.error(err.stack);
    await alertAdmin("Uncaught Exception", err.stack || err.message);
    // Give time for the alert to send before exiting
    setTimeout(() => process.exit(1), 2000);
  });

  process.on("unhandledRejection", async (reason: any) => {
    const msg = reason instanceof Error
      ? reason.stack || reason.message
      : String(reason);
    console.error("[Candalena] 💀 UNHANDLED REJECTION:", msg);
    await alertAdmin("Unhandled Promise Rejection", msg);
  });

  console.log("[Candalena] 🛡️ Global error handlers installed.");
}

/** Escape HTML special chars to prevent Telegram parse errors */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
