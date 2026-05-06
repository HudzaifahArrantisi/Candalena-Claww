// src/openclaw/schema-scraper.ts
// ─── Database Schema Scraper ───
// Extracts full DDL/structure from any university database using information_schema

import { DatabaseCredentials, TableSchema, ColumnInfo, ForeignKeyInfo, DatabaseDDL } from "./types";

/**
 * Connect and extract full database DDL from information_schema
 */
export async function scrapeDatabase(creds: DatabaseCredentials): Promise<DatabaseDDL> {
  switch (creds.type) {
    case "mysql":
      return scrapeMySQLSchema(creds);
    case "postgres":
      return scrapePostgresSchema(creds);
    case "mongodb":
      return scrapeMongoSchema(creds);
    default:
      throw new Error(`Unsupported database type: ${creds.type}`);
  }
}

// ─── MySQL / MariaDB ────────────────────────────────────────────

async function scrapeMySQLSchema(creds: DatabaseCredentials): Promise<DatabaseDDL> {
  const mysql2 = require("mysql2/promise");

  const connectionConfig: any = {
    host: creds.host,
    port: creds.port,
    user: creds.user,
    password: creds.password,
    database: creds.database,
  };

  // Enable SSL for cloud databases (Supabase, PlanetScale, Railway, etc.)
  if (creds.ssl) {
    connectionConfig.ssl = { rejectUnauthorized: false };
  }

  const connection = await mysql2.createConnection(connectionConfig);

  try {
    // 1. Get all tables
    const [tablesResult] = await connection.execute(
      `SELECT TABLE_NAME
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ?
       AND TABLE_TYPE = 'BASE TABLE'
       ORDER BY TABLE_NAME`,
      [creds.database]
    );

    const tables: TableSchema[] = [];

    for (const row of tablesResult as any[]) {
      const tableName = row.TABLE_NAME;

      // 2. Get columns for each table
      const [columnsResult] = await connection.execute(
        `SELECT
           c.COLUMN_NAME,
           c.DATA_TYPE,
           c.IS_NULLABLE,
           c.COLUMN_KEY,
           c.COLUMN_DEFAULT,
           c.EXTRA,
           c.COLUMN_TYPE
         FROM information_schema.COLUMNS c
         WHERE c.TABLE_SCHEMA = ?
         AND c.TABLE_NAME = ?
         ORDER BY c.ORDINAL_POSITION`,
        [creds.database, tableName]
      );

      const columns: ColumnInfo[] = (columnsResult as any[]).map((col: any) => ({
        name: col.COLUMN_NAME,
        dataType: col.COLUMN_TYPE || col.DATA_TYPE,
        isNullable: col.IS_NULLABLE === "YES",
        isPrimaryKey: col.COLUMN_KEY === "PRI",
        isForeignKey: col.COLUMN_KEY === "MUL",
        defaultValue: col.COLUMN_DEFAULT,
        extra: col.EXTRA,
      }));

      tables.push({ tableName, columns });
    }

    // 3. Get foreign key relationships
    const [fkResult] = await connection.execute(
      `SELECT
         CONSTRAINT_NAME,
         TABLE_NAME,
         COLUMN_NAME,
         REFERENCED_TABLE_NAME,
         REFERENCED_COLUMN_NAME
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ?
       AND REFERENCED_TABLE_NAME IS NOT NULL
       ORDER BY TABLE_NAME, COLUMN_NAME`,
      [creds.database]
    );

    const foreignKeys: ForeignKeyInfo[] = (fkResult as any[]).map((fk: any) => ({
      constraintName: fk.CONSTRAINT_NAME,
      tableName: fk.TABLE_NAME,
      columnName: fk.COLUMN_NAME,
      referencedTable: fk.REFERENCED_TABLE_NAME,
      referencedColumn: fk.REFERENCED_COLUMN_NAME,
    }));

    // Enrich columns with FK references
    for (const table of tables) {
      for (const col of table.columns) {
        const fk = foreignKeys.find(
          (f) => f.tableName === table.tableName && f.columnName === col.name
        );
        if (fk) {
          col.isForeignKey = true;
          col.referencedTable = fk.referencedTable;
          col.referencedColumn = fk.referencedColumn;
        }
      }
    }

    // 4. Generate human-readable DDL
    const rawDDL = generateDDLText(tables, foreignKeys, "mysql");

    return { tables, foreignKeys, rawDDL };
  } finally {
    await connection.end();
  }
}

// ─── PostgreSQL ─────────────────────────────────────────────────

async function scrapePostgresSchema(creds: DatabaseCredentials): Promise<DatabaseDDL> {
  const { Client } = require("pg");

  // Use connection string URL directly if available (Supabase, Neon, Railway)
  const clientConfig: any = creds.uri
    ? { connectionString: creds.uri }
    : {
        host: creds.host,
        port: creds.port,
        user: creds.user,
        password: creds.password,
        database: creds.database,
      };

  // Enable SSL for cloud databases
  if (creds.ssl && !creds.uri) {
    clientConfig.ssl = { rejectUnauthorized: false };
  }

  const client = new Client(clientConfig);

  await client.connect();

  try {
    // 1. Get all tables
    const tablesRes = await client.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
       AND table_type = 'BASE TABLE'
       ORDER BY table_name`
    );

    const tables: TableSchema[] = [];

    for (const row of tablesRes.rows) {
      const tableName = row.table_name;

      // 2. Get columns
      const columnsRes = await client.query(
        `SELECT
           c.column_name,
           c.data_type,
           c.is_nullable,
           c.column_default,
           c.udt_name,
           CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_pk
         FROM information_schema.columns c
         LEFT JOIN (
           SELECT kcu.column_name
           FROM information_schema.table_constraints tc
           JOIN information_schema.key_column_usage kcu
             ON tc.constraint_name = kcu.constraint_name
           WHERE tc.table_name = $1
           AND tc.constraint_type = 'PRIMARY KEY'
         ) pk ON pk.column_name = c.column_name
         WHERE c.table_schema = 'public'
         AND c.table_name = $1
         ORDER BY c.ordinal_position`,
        [tableName]
      );

      const columns: ColumnInfo[] = columnsRes.rows.map((col: any) => ({
        name: col.column_name,
        dataType: col.udt_name || col.data_type,
        isNullable: col.is_nullable === "YES",
        isPrimaryKey: col.is_pk,
        isForeignKey: false,
        defaultValue: col.column_default,
      }));

      tables.push({ tableName, columns });
    }

    // 3. Get foreign keys
    const fkRes = await client.query(
      `SELECT
         tc.constraint_name,
         tc.table_name,
         kcu.column_name,
         ccu.table_name AS referenced_table,
         ccu.column_name AS referenced_column
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
       JOIN information_schema.constraint_column_usage ccu
         ON ccu.constraint_name = tc.constraint_name
       WHERE tc.constraint_type = 'FOREIGN KEY'
       AND tc.table_schema = 'public'
       ORDER BY tc.table_name`
    );

    const foreignKeys: ForeignKeyInfo[] = fkRes.rows.map((fk: any) => ({
      constraintName: fk.constraint_name,
      tableName: fk.table_name,
      columnName: fk.column_name,
      referencedTable: fk.referenced_table,
      referencedColumn: fk.referenced_column,
    }));

    // Enrich columns with FK references
    for (const table of tables) {
      for (const col of table.columns) {
        const fk = foreignKeys.find(
          (f) => f.tableName === table.tableName && f.columnName === col.name
        );
        if (fk) {
          col.isForeignKey = true;
          col.referencedTable = fk.referencedTable;
          col.referencedColumn = fk.referencedColumn;
        }
      }
    }

    const rawDDL = generateDDLText(tables, foreignKeys, "postgres");

    return { tables, foreignKeys, rawDDL };
  } finally {
    await client.end();
  }
}

// ─── MongoDB ────────────────────────────────────────────────────

async function scrapeMongoSchema(creds: DatabaseCredentials): Promise<DatabaseDDL> {
  const { MongoClient } = require("mongodb");

  const uri = creds.uri || `mongodb://${creds.user ? `${creds.user}:${creds.password}@` : ""}${creds.host}:${creds.port}/${creds.database}`;
  const client = new MongoClient(uri);

  await client.connect();

  try {
    const db = client.db(creds.database);
    const collections = await db.listCollections().toArray();

    const tables: TableSchema[] = [];

    for (const collInfo of collections) {
      const coll = db.collection(collInfo.name);

      // Sample documents to infer schema
      const samples = await coll.find({}).limit(20).toArray();
      const fieldMap = new Map<string, { types: Set<string>; nullable: boolean }>();

      for (const doc of samples) {
        for (const [key, value] of Object.entries(doc)) {
          if (!fieldMap.has(key)) {
            fieldMap.set(key, { types: new Set(), nullable: false });
          }
          const entry = fieldMap.get(key)!;
          if (value === null || value === undefined) {
            entry.nullable = true;
          } else {
            entry.types.add(typeof value === "object" ? (Array.isArray(value) ? "array" : "object") : typeof value);
          }
        }
      }

      const columns: ColumnInfo[] = [];
      for (const [name, info] of fieldMap.entries()) {
        columns.push({
          name,
          dataType: Array.from(info.types).join("|") || "unknown",
          isNullable: info.nullable,
          isPrimaryKey: name === "_id",
          isForeignKey: false,
        });
      }

      tables.push({ tableName: collInfo.name, columns });
    }

    // MongoDB doesn't have formal FK — generate DDL text anyway
    const rawDDL = generateDDLText(tables, [], "mongodb");

    return { tables, foreignKeys: [], rawDDL };
  } finally {
    await client.close();
  }
}

// ─── DDL Text Generator ────────────────────────────────────────

function generateDDLText(
  tables: TableSchema[],
  foreignKeys: ForeignKeyInfo[],
  dbType: string,
): string {
  const lines: string[] = [];

  lines.push(`-- Database Schema Dump (${dbType.toUpperCase()})`);
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push(`-- Total tables/collections: ${tables.length}`);
  lines.push("");

  for (const table of tables) {
    lines.push(`-- ═══════════════════════════════════════`);
    lines.push(`-- Table: ${table.tableName}`);
    lines.push(`-- Columns: ${table.columns.length}`);
    lines.push(`-- ═══════════════════════════════════════`);

    if (dbType === "mongodb") {
      lines.push(`-- Collection: ${table.tableName}`);
      lines.push(`-- Fields (inferred from sample):`);
      for (const col of table.columns) {
        const pk = col.isPrimaryKey ? " [PRIMARY KEY]" : "";
        lines.push(`--   ${col.name}: ${col.dataType}${col.isNullable ? " (nullable)" : ""}${pk}`);
      }
    } else {
      lines.push(`CREATE TABLE ${table.tableName} (`);
      for (let i = 0; i < table.columns.length; i++) {
        const col = table.columns[i];
        const parts: string[] = [];
        parts.push(`  ${col.name}`);
        parts.push(col.dataType);
        if (col.isPrimaryKey) parts.push("PRIMARY KEY");
        if (!col.isNullable && !col.isPrimaryKey) parts.push("NOT NULL");
        if (col.defaultValue) parts.push(`DEFAULT ${col.defaultValue}`);
        if (col.extra) parts.push(col.extra);

        const comma = i < table.columns.length - 1 ? "," : "";
        lines.push(`  ${parts.join(" ")}${comma}`);
      }
      lines.push(");");
    }
    lines.push("");
  }

  // Foreign keys section
  if (foreignKeys.length > 0) {
    lines.push("-- ═══════════════════════════════════════");
    lines.push("-- Foreign Key Relationships");
    lines.push("-- ═══════════════════════════════════════");
    for (const fk of foreignKeys) {
      lines.push(`-- ${fk.tableName}.${fk.columnName} → ${fk.referencedTable}.${fk.referencedColumn} (${fk.constraintName})`);
      lines.push(`ALTER TABLE ${fk.tableName} ADD CONSTRAINT ${fk.constraintName}`);
      lines.push(`  FOREIGN KEY (${fk.columnName}) REFERENCES ${fk.referencedTable}(${fk.referencedColumn});`);
      lines.push("");
    }
  }

  // Summary
  lines.push("-- ═══════════════════════════════════════");
  lines.push("-- Relationship Summary");
  lines.push("-- ═══════════════════════════════════════");
  for (const fk of foreignKeys) {
    lines.push(`-- ${fk.tableName} ──[${fk.columnName}]──> ${fk.referencedTable}.${fk.referencedColumn}`);
  }

  return lines.join("\n");
}
