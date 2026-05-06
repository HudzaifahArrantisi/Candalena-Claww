// src/core/scheduler.ts
import cron from "node-cron";
import { scanAndNotify } from "../telegram/reminder";
import { ENV } from "../config/env";

export function startScheduler(): void {
  const schedule = ENV.CRON_SCHEDULE;
  console.log(`[Candalena] Scheduler active (cron: ${schedule})`);

  cron.schedule(schedule, async () => {
    console.log(`[Candalena] ⏰ Tick — ${new Date().toISOString()}`);
    try {
      await scanAndNotify();
    } catch (err: any) {
      console.error("[Candalena] ❌ Scheduler error:", err.message);
    }
  });
}