// src/adapters/adapter.factory.ts
import { DatabaseAdapter } from "./adapter.interface";
import { ENV } from "../config/env";
import { MySQLAdapter } from "./mysql.adapter";
import { PostgresAdapter } from "./postgres.adapter";
import { MongoDBAdapter } from "./mongodb.adapter";

let cachedAdapter: DatabaseAdapter | null = null;

/**
 * Factory: buat adapter berdasarkan DB_TYPE dari .env
 * Singleton — hanya satu instance per proses
 */
export function createAdapter(): DatabaseAdapter {
  if (cachedAdapter) return cachedAdapter;

  const config = {
    host: ENV.DB_HOST,
    port: parseInt(ENV.DB_PORT, 10),
    user: ENV.DB_USER,
    password: ENV.DB_PASS,
    database: ENV.DB_NAME,
    uri: ENV.DB_URI,
  };

  switch (ENV.DB_TYPE) {
    case "mysql":
      cachedAdapter = new MySQLAdapter(config);
      break;

    case "postgres":
      cachedAdapter = new PostgresAdapter(config);
      break;

    case "mongodb":
      cachedAdapter = new MongoDBAdapter(config);
      break;

    default:
      throw new Error(
        `[OpenClaw] ❌ Unsupported DB_TYPE: "${ENV.DB_TYPE}".\n` +
        `           Supported: mysql, postgres, mongodb`
      );
  }

  console.log(`[OpenClaw] Database engine: ${cachedAdapter.engineName}`);
  return cachedAdapter;
}

/**
 * Get existing adapter (must call createAdapter first)
 */
export function getAdapter(): DatabaseAdapter {
  if (!cachedAdapter) {
    return createAdapter();
  }
  return cachedAdapter;
}
