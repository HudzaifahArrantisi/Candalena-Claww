// src/telegram/formatter.ts
import { Assignment } from "../adapters/adapter.interface";

/**
 * Format pesan notifikasi tugas baru
 */
export function formatReminderMessage(task: Assignment): string {
  const now = new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "full",
    timeStyle: "short",
  });

  const lines = [
    `📚 <b>TUGAS BARU</b>`,
    `━━━━━━━━━━━━━━━━━━`,
    `📝 <b>Judul:</b> ${task.title}`,
  ];

  if (task.lecturer) lines.push(`👨‍🏫 <b>Dosen:</b> ${task.lecturer}`);
  if (task.course)   lines.push(`📖 <b>Mata Kuliah:</b> ${task.course}`);
  if (task.kelas && task.semester) {
    lines.push(`🏫 <b>Kelas:</b> ${task.kelas} — Semester ${task.semester}`);
  } else if (task.kelas) {
    lines.push(`🏫 <b>Kelas:</b> ${task.kelas}`);
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
  lines.push(`🤖 <i>OpenClaw Reminder Engine</i>`);

  return lines.join("\n");
}