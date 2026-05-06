// src/lib/db-url-parser.ts
// ─── Database Connection String Parser ───
// Parses cloud database URLs from Supabase, Neon, Railway, PlanetScale, MongoDB Atlas, etc.

import { DatabaseCredentials } from "./types";

/**
 * Known cloud database providers and their URL patterns
 */
const CLOUD_PROVIDERS: Record<string, { name: string; icon: string }> = {
  "supabase.co": { name: "Supabase", icon: "⚡" },
  "supabase.com": { name: "Supabase", icon: "⚡" },
  "neon.tech": { name: "Neon DB", icon: "🐘" },
  "railway.app": { name: "Railway", icon: "🚂" },
  "aivencloud.com": { name: "Aiven", icon: "☁️" },
  "cockroachlabs.cloud": { name: "CockroachDB", icon: "🪳" },
  "mongodb.net": { name: "MongoDB Atlas", icon: "🍃" },
  "planetscale.us": { name: "PlanetScale", icon: "🪐" },
  "aws.neon.tech": { name: "Neon DB", icon: "🐘" },
};

/**
 * Detect which cloud provider a URL belongs to
 */
export function detectCloudProvider(url: string): { name: string; icon: string } | null {
  const lowerUrl = url.toLowerCase();
  for (const [domain, info] of Object.entries(CLOUD_PROVIDERS)) {
    if (lowerUrl.includes(domain)) {
      return info;
    }
  }
  return null;
}

/**
 * Parse a database connection string URL into DatabaseCredentials.
 *
 * Supports formats:
 *   postgresql://user:pass@host:port/dbname?sslmode=require
 *   postgres://user:pass@host:port/dbname
 *   mysql://user:pass@host:port/dbname
 *   mongodb+srv://user:pass@cluster.mongodb.net/dbname
 *   mongodb://user:pass@host:port/dbname
 */
export function parseDatabaseUrl(url: string): DatabaseCredentials {
  const trimmed = url.trim();

  // ─── Determine DB type from protocol ──────────────────────────
  let dbType: "mysql" | "postgres" | "mongodb";

  if (/^(postgres(ql)?):\/\//i.test(trimmed)) {
    dbType = "postgres";
  } else if (/^mysql:\/\//i.test(trimmed)) {
    dbType = "mysql";
  } else if (/^mongodb(\+srv)?:\/\//i.test(trimmed)) {
    dbType = "mongodb";
  } else {
    throw new Error(
      `Unsupported database URL protocol. Expected postgresql://, mysql://, or mongodb://\n` +
      `  Received: ${trimmed.substring(0, 30)}...`
    );
  }

  // ─── MongoDB special handling (mongodb+srv doesn't use ports) ─
  if (dbType === "mongodb") {
    return parseMongoUrl(trimmed);
  }

  // ─── Parse standard SQL URL ───────────────────────────────────
  // Use the built-in URL parser, but we need to normalize the protocol first
  // because URL doesn't understand "postgresql://" — replace with "http://" for parsing
  const normalizedUrl = trimmed.replace(/^(postgres(ql)?|mysql):\/\//i, "http://");

  let parsed: URL;
  try {
    parsed = new URL(normalizedUrl);
  } catch (err) {
    throw new Error(
      `Invalid database URL format.\n` +
      `  Expected: ${dbType}://user:password@host:port/database\n` +
      `  Received: ${trimmed.substring(0, 50)}...`
    );
  }

  const host = parsed.hostname;
  const port = parsed.port
    ? parseInt(parsed.port)
    : dbType === "postgres" ? 5432 : 3306;
  const user = decodeURIComponent(parsed.username || "");
  const password = decodeURIComponent(parsed.password || "");
  const database = parsed.pathname.replace(/^\//, "") || "";

  if (!host) {
    throw new Error("Database URL is missing the hostname.");
  }
  if (!database) {
    throw new Error("Database URL is missing the database name.");
  }
  if (!user) {
    throw new Error("Database URL is missing the username.");
  }

  // Check for SSL parameter (common in cloud databases)
  const sslMode = parsed.searchParams.get("sslmode") || parsed.searchParams.get("ssl");
  const useSSL = sslMode === "require" || sslMode === "true" || sslMode === "verify-full";

  return {
    type: dbType,
    host,
    port,
    user,
    password,
    database,
    uri: trimmed,
    ssl: useSSL || isCloudHost(host),
  };
}

/**
 * Parse MongoDB connection strings (handles both mongodb:// and mongodb+srv://)
 */
function parseMongoUrl(url: string): DatabaseCredentials {
  // MongoDB URLs can be complex, especially +srv, so we keep the original URI
  // and just extract the database name for reference
  const normalizedUrl = url.replace(/^mongodb(\+srv)?:\/\//i, "http://");

  let parsed: URL;
  try {
    parsed = new URL(normalizedUrl);
  } catch {
    throw new Error(
      `Invalid MongoDB URL format.\n` +
      `  Expected: mongodb+srv://user:password@cluster/database\n` +
      `  Received: ${url.substring(0, 50)}...`
    );
  }

  const host = parsed.hostname;
  const port = parsed.port ? parseInt(parsed.port) : 27017;
  const user = decodeURIComponent(parsed.username || "");
  const password = decodeURIComponent(parsed.password || "");
  const database = parsed.pathname.replace(/^\//, "") || "test";

  return {
    type: "mongodb",
    host,
    port,
    user,
    password,
    database,
    uri: url,
    ssl: true, // Cloud MongoDB always uses SSL
  };
}

/**
 * Check if host is a known cloud provider (to auto-enable SSL)
 */
function isCloudHost(host: string): boolean {
  const lowerHost = host.toLowerCase();
  return Object.keys(CLOUD_PROVIDERS).some((domain) => lowerHost.includes(domain));
}

/**
 * Format a parsed DatabaseCredentials into a human-readable summary line
 */
export function formatCredentialsSummary(creds: DatabaseCredentials): string {
  const provider = creds.uri ? detectCloudProvider(creds.uri) : null;
  const providerLabel = provider ? ` ${provider.icon} ${provider.name}` : "";
  const sslLabel = creds.ssl ? " 🔒 SSL" : "";
  const maskedPass = creds.password ? "***" : "(none)";

  return `${creds.type}://${creds.user}:${maskedPass}@${creds.host}:${creds.port}/${creds.database}${sslLabel}${providerLabel}`;
}
