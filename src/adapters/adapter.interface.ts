// src/adapters/adapter.interface.ts
// Universal database adapter — semua DB engine harus implement ini

export interface Assignment {
  id: string | number;
  title: string;
  lecturer?: string | null;
  course?: string | null;
  semester?: string | null;
  kelas?: string | null;
  telegram_channel?: string | null;
  deadline?: Date | string | null;
  notified?: boolean | number;
}

export interface SchemaMapping {
  id: string;
  title: string;
  deadline: string | null;
  course: string | null;
  lecturer: string | null;
  semester: string | null;
  kelas: string | null;
  telegramChannel: string | null;
  notified: string;
}

export interface DatabaseAdapter {
  /** Nama engine, misal "mysql", "postgres", "mongodb" */
  readonly engineName: string;

  /** Test koneksi ke database */
  testConnection(): Promise<void>;

  /** Auto-detect kolom dari tabel/collection */
  detectSchema(tableName: string): Promise<SchemaMapping>;

  /** Ambil semua tugas yang belum di-notif */
  scanAssignments(tableName: string, schema: SchemaMapping): Promise<Assignment[]>;

  /** Ambil tugas yang punya deadline mendekati (untuk reminder H-3, H-1, H-0) */
  scanDeadlines(tableName: string, schema: SchemaMapping, daysBeforeDeadline: number[]): Promise<Assignment[]>;

  /** Mark tugas sebagai sudah di-notif */
  markNotified(tableName: string, schema: SchemaMapping, ids: (string | number)[]): Promise<void>;

  /** Query semua data dari tabel (untuk API) */
  queryAll(tableName: string): Promise<any[]>;

  /** Tutup koneksi / pool */
  close(): Promise<void>;
}
