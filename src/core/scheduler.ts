// src/core/scheduler.ts
import cron from "node-cron";
import { scanAndNotify } from "../telegram/reminder";
import { ENV } from "../config/env";

export function startScheduler(): void {
  const schedule = ENV.CRON_SCHEDULE;
  console.log(`[OpenClaw] Scheduler active (cron: ${schedule})`);

  cron.schedule(schedule, async () => {
    console.log(`[OpenClaw] ⏰ Tick — ${new Date().toISOString()}`);
    try {
      await scanAndNotify();
    } catch (err: any) {
      console.error("[OpenClaw] ❌ Scheduler error:", err.message);
    }
  });
}