// src/core/deadline.ts
import { ENV } from "../config/env";
import { scanDeadlines } from "./engine";
import { Assignment } from "../adapters/adapter.interface";

/**
 * Parse DEADLINE_REMIND_DAYS dari ENV, e.g. "3,1,0" → [3, 1, 0]
 */
export function getRemindDays(): number[] {
  return ENV.DEADLINE_REMIND_DAYS
    .split(",")
    .map((d) => parseInt(d.trim(), 10))
    .filter((d) => !isNaN(d));
}

/**
 * Format deadline reminder message
 */
export function formatDeadlineMessage(task: Assignment, daysLeft: number): string {
  const now = new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "full",
    timeStyle: "short",
  });

  let urgency: string;
  if (daysLeft === 0) {
    urgency = "🔴 HARI INI! DEADLINE!";
  } else if (daysLeft === 1) {
    urgency = "🟡 BESOK! H-1";
  } else {
    urgency = `🟢 H-${daysLeft}`;
  }

  const lines = [
    `⏰ <b>DEADLINE REMINDER</b>`,
    `━━━━━━━━━━━━━━━━━━`,
    `${urgency}`,
    `📝 <b>Judul:</b> ${task.title}`,
  ];

  if (task.lecturer && String(task.lecturer).toLowerCase() !== "null") {
    lines.push(`👨‍🏫 <b>Dosen:</b> ${task.lecturer}`);
  }
  if (task.course && String(task.course).toLowerCase() !== "null") {
    lines.push(`📖 <b>Mata Kuliah:</b> ${task.course}`);
  }
  const kelas = (task.kelas && String(task.kelas).toLowerCase() !== "null") ? task.kelas : null;
  const semester = (task.semester && String(task.semester).toLowerCase() !== "null") ? task.semester : null;

  if (kelas && semester) {
    lines.push(`🏫 <b>Kelas:</b> ${kelas} — Semester ${semester}`);
  } else if (kelas) {
    lines.push(`🏫 <b>Kelas:</b> ${kelas}`);
  }
  if (task.deadline) {
    const dl = new Date(task.deadline as string);
    const dlStr = dl.toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      dateStyle: "full",
      timeStyle: "short",
    });
    lines.push(`📅 <b>Deadline:</b> ${dlStr}`);
  }

  lines.push(`━━━━━━━━━━━━━━━━━━`);
  lines.push(`🕐 ${now}`);
  lines.push(`🤖 <i>Candalena Claw Reminder</i>`);

  return lines.join("\n");
}

/**
 * Scan assignments yang mendekati deadline
 */
export async function getDeadlineTasks(): Promise<
  { task: Assignment; daysLeft: number }[]
> {
  const days = getRemindDays();
  if (days.length === 0) return [];

  const tasks = await scanDeadlines(days);

  // Calculate days left for each task
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return tasks.map((task) => {
    const dl = new Date(task.deadline as string);
    dl.setHours(0, 0, 0, 0);
    const diff = Math.round((dl.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return { task, daysLeft: Math.max(0, diff) };
  });
}
