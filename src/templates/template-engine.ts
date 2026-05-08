// src/templates/template-engine.ts
// ─── Candalena Claw v5.0 — Dynamic Message Template Engine ───
// Simple {{var}} parser. Admin can customize message wording via .env
// without touching any code.

export interface TemplateVars {
  matkul?: string;
  judul?: string;
  dosen?: string;
  kelas?: string;
  semester?: string;
  deadline?: string;
  urgency?: string;
  hari?: string | number;
  [key: string]: any;
}

/**
 * Parse a template string, replacing {{key}} with corresponding values.
 * Unmatched placeholders are kept as-is (useful for debugging).
 */
export function renderTemplate(template: string, vars: TemplateVars): string {
  // Unescape \n from .env strings to actual newlines
  const resolved = template.replace(/\\n/g, "\n");

  return resolved.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const val = vars[key];
    const valStr = String(val).trim();
    if (val !== undefined && val !== null && valStr !== "" && valStr.toLowerCase() !== "null") {
      return valStr;
    }
    return ""; // Remove placeholder if no value (cleaner output)
  });
}

// ═══════════════════════════════════════════
// Default Templates (fallback if .env is empty)
// ═══════════════════════════════════════════

export const DEFAULT_NEW_TASK_TEMPLATE = [
  `📢 <b>PEMBERITAHUAN TUGAS BARU</b>`,
  `─────────────────────────`,
  `📖 <b>Mata Kuliah:</b> {{matkul}}`,
  `📝 <b>Judul Tugas:</b> {{judul}}`,
  `👨‍🏫 <b>Dosen:</b> {{dosen}}`,
  `🏫 <b>Kelas:</b> {{kelas}}`,
  `📅 <b>Batas Waktu:</b> {{deadline}}`,
  ``,
  `Mohon segera memeriksa sistem akademik untuk detail lebih lanjut.`,
  `─────────────────────────`,
].join("\n");

export const DEFAULT_DEADLINE_TEMPLATE = [
  `⏰ <b>PENGINGAT BATAS WAKTU TUGAS</b>`,
  `─────────────────────────`,
  `{{urgency}}`,
  `📖 <b>Mata Kuliah:</b> {{matkul}}`,
  `📝 <b>Judul Tugas:</b> {{judul}}`,
  `👨‍🏫 <b>Dosen:</b> {{dosen}}`,
  `🏫 <b>Kelas:</b> {{kelas}}`,
  `📅 <b>Batas Waktu:</b> {{deadline}}`,
  ``,
  `Diharapkan untuk segera menyelesaikan tugas sebelum batas waktu berakhir.`,
  `─────────────────────────`,
].join("\n");
