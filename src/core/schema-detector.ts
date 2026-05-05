// src/core/schema-detector.ts

import { SchemaMapping } from "../adapters/adapter.interface";
import { ENV } from "../config/env";

const HINTS = {
  id:       ["id", "_id", "pk"],
  title:    ["title", "judul", "nama_tugas", "name", "task", "assignment", "subject", "tugas"],
  deadline: ["deadline", "due_date", "batas_waktu", "due", "waktu", "pengumpulan", "duedate"],
  notified: ["notified", "sent", "is_sent", "terkirim", "sudah_notif"],
  telegram: ["telegram", "telegram_channel", "channel", "tele_channel", "tele"],
  course:   ["course", "mata_kuliah", "matkul", "subject", "kelas_mk"],
  lecturer: ["lecturer", "dosen", "pengajar", "guru", "teacher"],
  semester: ["semester", "term", "period", "tahun"],
  kelas:    ["kelas", "class", "room", "rombel", "group"],
};

function findColumn(columns: string[], hints: string[]): string | null {
  return (
    columns.find((c) =>
      hints.some((h) => c.toLowerCase() === h || c.toLowerCase().includes(h))
    ) ?? null
  );
}

/**
 * Auto-detect kolom dari nama-nama kolom di tabel/collection.
 * Jika ada override dari ENV (COL_*), gunakan override.
 */
export function detectColumns(columnNames: string[]): SchemaMapping {
  return {
    id:              ENV.COL_ID       || findColumn(columnNames, HINTS.id)       || columnNames[0],
    title:           ENV.COL_TITLE    || findColumn(columnNames, HINTS.title)    || columnNames[1],
    deadline:        ENV.COL_DEADLINE || findColumn(columnNames, HINTS.deadline),
    notified:        ENV.COL_NOTIFIED || findColumn(columnNames, HINTS.notified) || "notified",
    telegramChannel: ENV.COL_TELEGRAM || findColumn(columnNames, HINTS.telegram),
    course:          ENV.COL_COURSE   || findColumn(columnNames, HINTS.course),
    lecturer:        ENV.COL_LECTURER || findColumn(columnNames, HINTS.lecturer),
    semester:        ENV.COL_SEMESTER || findColumn(columnNames, HINTS.semester),
    kelas:           ENV.COL_KELAS    || findColumn(columnNames, HINTS.kelas),
  };
}