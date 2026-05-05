// src/adapters/mysql.adapter.ts
import mysql, { Pool } from "mysql2/promise";
import { DatabaseAdapter, Assignment, SchemaMapping } from "./adapter.interface";
import { detectColumns } from "../core/schema-detector";

export class MySQLAdapter implements DatabaseAdapter {
  readonly engineName = "mysql";
  private pool: Pool;

  constructor(config: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  }) {
    this.pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 10,
    });
  }

  async testConnection(): Promise<void> {
    const conn = await this.pool.getConnection();
    console.log("[OpenClaw] ✅ MySQL connected");
    conn.release();
  }

  async detectSchema(tableName: string): Promise<SchemaMapping> {
    const [rows] = await this.pool.query<any[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [tableName]
    );
    const columnNames = rows.map((r: any) => r.COLUMN_NAME);
    if (columnNames.length === 0) {
      throw new Error(`[OpenClaw] Table "${tableName}" not found or has no columns.`);
    }
    return detectColumns(columnNames);
  }

  async scanAssignments(tableName: string, schema: SchemaMapping): Promise<Assignment[]> {
    const cols = this.buildSelectCols(schema);
    const [rows] = await this.pool.query<any[]>(
      `SELECT ${cols} FROM \`${tableName}\` WHERE \`${schema.notified}\` = 0`
    );
    return rows as Assignment[];
  }

  async scanDeadlines(
    tableName: string,
    schema: SchemaMapping,
    daysBeforeDeadline: number[]
  ): Promise<Assignment[]> {
    if (!schema.deadline) return [];

    // Build WHERE clause: deadline between today and today+N for each day
    const conditions = daysBeforeDeadline.map(
      (d) => `DATE(\`${schema.deadline}\`) = CURDATE() + INTERVAL ${d} DAY`
    );
    const whereDeadline = conditions.join(" OR ");

    const cols = this.buildSelectCols(schema);
    const [rows] = await this.pool.query<any[]>(
      `SELECT ${cols} FROM \`${tableName}\`
       WHERE (${whereDeadline})
       AND \`${schema.notified}\` = 1`
    );
    return rows as Assignment[];
  }

  async markNotified(
    tableName: string,
    schema: SchemaMapping,
    ids: (string | number)[]
  ): Promise<void> {
    if (ids.length === 0) return;
    await this.pool.query(
      `UPDATE \`${tableName}\` SET \`${schema.notified}\` = 1 WHERE \`${schema.id}\` IN (?)`,
      [ids]
    );
  }

  async queryAll(tableName: string): Promise<any[]> {
    const [rows] = await this.pool.query<any[]>(`SELECT * FROM \`${tableName}\``);
    return rows as any[];
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
        col ? `\`${col}\` AS \`${alias}\`` : `NULL AS \`${alias}\``
      )
      .join(", ");
  }
}
