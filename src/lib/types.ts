// src/lib/types.ts
// ─── Type definitions for Candalena Claw ───

export interface DatabaseCredentials {
  type: "mysql" | "postgres" | "mongodb";
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  uri?: string;
  ssl?: boolean;
}

export interface TableSchema {
  tableName: string;
  columns: ColumnInfo[];
}

export interface ColumnInfo {
  name: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  referencedTable?: string;
  referencedColumn?: string;
  defaultValue?: string;
  extra?: string;
}

export interface ForeignKeyInfo {
  constraintName: string;
  tableName: string;
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
}

export interface DatabaseDDL {
  tables: TableSchema[];
  foreignKeys: ForeignKeyInfo[];
  rawDDL: string;
}
