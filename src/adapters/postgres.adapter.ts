// src/adapters/postgres.adapter.ts
import { DatabaseAdapter, Assignment, SchemaMapping } from "./adapter.interface";
import { detectColumns } from "../core/schema-detector";

// Lazy-load pg to avoid crash if not installed
let pg: any = null;
function getPg() {
  if (!pg) {
    try {
      pg = require("pg");
    } catch {
      throw new Error(
        '[OpenClaw] PostgreSQL driver not installed. Run: npm install pg\n' +
        '           For TypeScript types: npm install -D @types/pg'
      );
    }
  }
  return pg;
}

export class PostgresAdapter implements DatabaseAdapter {
  readonly engineName = "postgres";
  private pool: any;

  constructor(config: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  }) {
    const { Pool } = getPg();
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      max: 10,
    });
  }

  async testConnection(): Promise<void> {
    const client = await this.pool.connect();
    console.log("[OpenClaw] ✅ PostgreSQL connected");
    client.release();
  }

  async detectSchema(tableName: string): Promise<SchemaMapping> {
    const result = await this.pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = $1 AND table_schema = 'public'`,
      [tableName]
    );
    const columnNames = result.rows.map((r: any) => r.column_name);
    if (columnNames.length === 0) {
      throw new Error(`[OpenClaw] Table "${tableName}" not found or has no columns.`);
    }
    return detectColumns(columnNames);
  }

  async scanAssignments(tableName: string, schema: SchemaMapping): Promise<Assignment[]> {
    const cols = this.buildSelectCols(schema);
    const result = await this.pool.query(
      `SELECT ${cols} FROM "${tableName}" WHERE "${schema.notified}" = 0`
    );
    return result.rows as Assignment[];
  }

  async scanDeadlines(
    tableName: string,
    schema: SchemaMapping,
    daysBeforeDeadline: number[]
  ): Promise<Assignment[]> {
    if (!schema.deadline) return [];

    const conditions = daysBeforeDeadline.map(
      (d) => `"${schema.deadline}"::date = CURRENT_DATE + INTERVAL '${d} days'`
    );
    const whereDeadline = conditions.join(" OR ");

    const cols = this.buildSelectCols(schema);
    const result = await this.pool.query(
      `SELECT ${cols} FROM "${tableName}"
       WHERE (${whereDeadline})
       AND "${schema.notified}" = 1`
    );
    return result.rows as Assignment[];
  }

  async markNotified(
    tableName: string,
    schema: SchemaMapping,
    ids: (string | number)[]
  ): Promise<void> {
    if (ids.length === 0) return;
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
    await this.pool.query(
      `UPDATE "${tableName}" SET "${schema.notified}" = 1 WHERE "${schema.id}" IN (${placeholders})`,
      ids
    );
  }

  async queryAll(tableName: string): Promise<any[]> {
    const result = await this.pool.query(`SELECT * FROM "${tableName}"`);
    return result.rows;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private buildSelectCols(schema: SchemaMapping): string {
    const mapping: [string | null, string][] = [
      [schema.id, "id"],
      [schema.title, "title"],
      [schema.telegramChannel, "telegram_channel"],
      [schema.course, "course"],
      [schema.lecturer, "lecturer"],
      [schema.semester, "semester"],
      [schema.kelas, "kelas"],
      [schema.deadline, "deadline"],
      [schema.notified, "notified"],
    ];
    return mapping
      .map(([col, alias]) =>
        col ? `"${col}" AS "${alias}"` : `NULL AS "${alias}"`
      )
      .join(", ");
  }
}
