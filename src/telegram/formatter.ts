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