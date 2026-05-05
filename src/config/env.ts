// src/config/env.ts
import dotenv from "dotenv";
dotenv.config();

export const ENV = {
  // Database
  DB_TYPE:    (process.env.DB_TYPE || "mysql") as "mysql" | "postgres" | "mongodb",
  DB_HOST:    process.env.DB_HOST    || "localhost",
  DB_PORT:    process.env.DB_PORT    || "3306",
  DB_USER:    process.env.DB_USER    || "root",
  DB_PASS:    process.env.DB_PASS    || "",
  DB_NAME:    process.env.DB_NAME    || "openclaw",

  // MongoDB specific (connection string override)
  DB_URI:     process.env.DB_URI     || "",

  // Schema mapping (kosong = auto-detect)
  TABLE_NAME:   process.env.TABLE_NAME   || "tugas",
  COL_ID:       process.env.COL_ID       || "",
  COL_TITLE:    process.env.COL_TITLE    || "",
  COL_DEADLINE: process.env.COL_DEADLINE || "",
  COL_COURSE:   process.env.COL_COURSE   || "",
  COL_LECTURER: process.env.COL_LECTURER || "",
  COL_SEMESTER: process.env.COL_SEMESTER || "",
  COL_KELAS:    process.env.COL_KELAS    || "",
  COL_TELEGRAM: process.env.COL_TELEGRAM || "",
  COL_NOTIFIED: process.env.COL_NOTIFIED || "",

  // Telegram
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",

  // Scheduler
  CRON_SCHEDULE: process.env.CRON_SCHEDULE || "* * * * *",

  // Deadline reminders (comma-separated days before deadline)
  DEADLINE_REMIND_DAYS: process.env.DEADLINE_REMIND_DAYS || "3,1,0",

  // Server
  PORT: process.env.PORT || "3000",
};
