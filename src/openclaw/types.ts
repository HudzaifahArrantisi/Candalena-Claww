// src/openclaw/types.ts
// ─── Type definitions for OpenClaw AI Integration ───

export interface DatabaseCredentials {
  type: "mysql" | "postgres" | "mongodb";
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  uri?: string;
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

export interface AISchemaMapping {
  dosenTable: string;
  mahasiswaTable: string;
  kelasTable: string;
  tugasTable: string;
  mataKuliahTable: string;
  fakultasTable?: string;
  prodiTable?: string;
  angkatanTable?: string;
  joins: JoinMapping[];
  telegramRoutingQuery: string;
  newAssignmentQuery: string;
}

export interface JoinMapping {
  from: { table: string; column: string };
  to: { table: string; column: string };
  type: "INNER" | "LEFT" | "RIGHT";
  description: string;
}

export interface TelegramRouting {
  classId: string;
  className: string;
  chatId: string;
  topicId?: string;
}

export interface OpenClawConfig {
  channels: {
    telegram: {
      enabled: boolean;
      botToken: string;
      dmPolicy: string;
      groups: Record<string, { requireMention: boolean; groupPolicy?: string }>;
    };
  };
  tools?: {
    profile?: string;
    allow?: string[];
    exec?: { autoApprove?: string[] };
  };
  agents?: {
    defaults?: {
      model?: string;
      systemPrompt?: string;
    };
    list?: Array<{
      id: string;
      name: string;
      systemPrompt?: string;
      skills?: string[];
    }>;
  };
  hooks?: {
    enabled: boolean;
    token: string;
    path: string;
  };
}

export interface CronJobConfig {
  name: string;
  cron: string;
  tz: string;
  session: string;
  message: string;
  announce: boolean;
  channel: string;
  to: string;
  tools?: string[];
}

export interface InstallationState {
  openclawInstalled: boolean;
  telegramConfigured: boolean;
  databaseScraped: boolean;
  aiMappingComplete: boolean;
  cronJobsCreated: boolean;
  gatewayStarted: boolean;
}
