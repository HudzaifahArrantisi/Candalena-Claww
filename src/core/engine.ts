// src/core/engine.ts
import { ENV } from "../config/env";
import { createAdapter, getAdapter } from "../adapters/adapter.factory";
import { SchemaMapping, Assignment } from "../adapters/adapter.interface";
import { startScheduler } from "./scheduler";

const TABLE = ENV.TABLE_NAME || "tugas";
let cachedSchema: SchemaMapping | null = null;

/**
 * Boot engine: test connection → detect schema → start scheduler
 */
export async function startEngine(): Promise<void> {
  console.log("[Candalena] Engine starting...");
  console.log(`[Candalena] DB Type: ${ENV.DB_TYPE}`);
  console.log(`[Candalena] DB Host: ${ENV.DB_HOST}:${ENV.DB_PORT}`);
  console.log(`[Candalena] DB Name: ${ENV.DB_NAME}`);
  console.log(`[Candalena] Table:   ${TABLE}`);

  const adapter = createAdapter();

  // Test connection
  await adapter.testConnection();

  // Auto-detect schema
  const schema = await adapter.detectSchema(TABLE);
  cachedSchema = schema;
  console.log("[Candalena] Schema detected:", JSON.stringify(schema, null, 2));

  // Start cron scheduler
  startScheduler();

  console.log("[Candalena] ✅ Engine running.");
}

/**
 * Get cached schema (call after engine started)
 */
export async function getSchema(): Promise<SchemaMapping> {
  if (cachedSchema) return cachedSchema;
  const adapter = getAdapter();
  cachedSchema = await adapter.detectSchema(TABLE);
  return cachedSchema;
}

/**
 * Scan semua tugas yang belum di-notif
 */
export async function scanAssignments(): Promise<Assignment[]> {
  const adapter = getAdapter();
  const schema = await getSchema();
  return adapter.scanAssignments(TABLE, schema);
}

/**
 * Scan tugas yang deadline-nya mendekati
 */
export async function scanDeadlines(days: number[]): Promise<Assignment[]> {
  const adapter = getAdapter();
  const schema = await getSchema();
  return adapter.scanDeadlines(TABLE, schema, days);
}

/**
 * Mark IDs sebagai notified
 */
export async function markNotified(ids: (string | number)[]): Promise<void> {
  const adapter = getAdapter();
  const schema = await getSchema();
  await adapter.markNotified(TABLE, schema, ids);
}

/**
 * Query semua data (untuk API)
 */
export async function queryAllTasks(): Promise<any[]> {
  const adapter = getAdapter();
  return adapter.queryAll(TABLE);
}

/**
 * Get engine info (untuk status API)
 */
export function getEngineInfo() {
  const adapter = getAdapter();
  return {
    engine: adapter.engineName,
    table: TABLE,
    schema: cachedSchema,
    dbHost: ENV.DB_HOST,
    dbName: ENV.DB_NAME,
  };
}