// src/bot/bot-handlers.ts
// ─── Candalena Claw v5.0 — Interactive Bot Command Handlers ───
// Handles /tugas, /help commands and inline keyboard callbacks.

import { getAdapter } from "../adapters/adapter.factory";

// ═══════════════════════════════════════════
// In-Memory: dismissed tasks (resets on daemon restart)
// ═══════════════════════════════════════════

const dismissedTasks = new Set<string>(); // "chatId-taskId"

export function isTaskDismissed(chatId: string, taskId: string | number): boolean {
  return dismissedTasks.has(`${chatId}-${taskId}`);
}

export function dismissTask(chatId: string, taskId: string | number): void {
  dismissedTasks.add(`${chatId}-${taskId}`);
}

// ═══════════════════════════════════════════
// /tugas — List active tasks
// ═══════════════════════════════════════════

export async function handleTugasCommand(tableName: string, tz: string): Promise<string> {
  try {
    const adapter = getAdapter();
    const allTasks = await adapter.queryAll(tableName);

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Filter: only tasks with deadline in the future or no deadline
    const activeTasks = allTasks.filter((row: any) => {
      const dl = row.deadline || row.batas_waktu || row.due_date;
      if (!dl) return true; // no deadline = still active
      try {
        return new Date(dl) >= now;
      } catch {
        return true;
      }
    });

    if (activeTasks.length === 0) {
      return "✅ Tidak ada tugas aktif saat ini. Selamat! 🎉";
    }

    const lines = [
      `📋 <b>DAFTAR TUGAS AKTIF</b> (${activeTasks.length})`,
      `─────────────────────────`,
    ];

    const display = activeTasks.slice(0, 10);
    for (const [i, task] of display.entries()) {
      const title = task.judul || task.title || task.nama_tugas || "(Tanpa Judul)";
      const matkul = task.mata_kuliah || task.course || task.kode_mk || "";
      const dl = task.deadline || task.batas_waktu || task.due_date;

      let dlStr = "—";
      if (dl) {
        try {
          dlStr = new Date(dl).toLocaleDateString("id-ID", { timeZone: tz });
        } catch { /* skip */ }
      }

      const matkulStr = matkul ? ` [${matkul}]` : "";
      lines.push(`${i + 1}. ${title}${matkulStr} (⏰ ${dlStr})`);
    }

    if (activeTasks.length > 10) {
      lines.push(`\n... dan ${activeTasks.length - 10} tugas lainnya.`);
    }

    lines.push(`\n─────────────────────────`);
    lines.push(`<i>🦞 Candalena Claw Bot</i>`);

    return lines.join("\n");
  } catch (err: any) {
    console.error("[Bot] Error handling /tugas:", err.message);
    return "❌ Gagal mengambil data tugas. Silakan coba lagi nanti.";
  }
}

// ═══════════════════════════════════════════
// /help — Show usage guide
// ═══════════════════════════════════════════

export function handleHelpCommand(): string {
  return [
    `🦞 <b>Candalena Claw — Panduan Bot</b>`,
    `─────────────────────────`,
    ``,
    `<b>Perintah yang tersedia:</b>`,
    ``,
    `/tugas — Lihat daftar tugas aktif`,
    `/help  — Tampilkan panduan ini`,
    ``,
    `<b>Fitur Otomatis:</b>`,
    `• Notifikasi tugas baru secara real-time`,
    `• Pengingat deadline H-3, H-1, H-0`,
    `• Tombol <b>[Tandai Selesai]</b> untuk hentikan reminder`,
    ``,
    `─────────────────────────`,
    `<i>🤖 Powered by Candalena Claw v5.0</i>`,
  ].join("\n");
}

// ═══════════════════════════════════════════
// /start — Welcome message
// ═══════════════════════════════════════════

export function handleStartCommand(): string {
  return [
    `🦞 <b>Selamat datang di Candalena Claw!</b>`,
    ``,
    `Bot ini akan mengirimkan notifikasi otomatis untuk:`,
    `• 📚 Tugas baru yang dibuat dosen`,
    `• ⏰ Pengingat deadline yang mendekat`,
    ``,
    `Ketik /help untuk melihat semua perintah.`,
  ].join("\n");
}
