// src/dashboard/log-buffer.ts
// ─── Candalena Claw v5.0 — Circular Log Buffer ───
// Intercepts console.log/error/warn and stores last 50 lines in memory.
// Used by the web dashboard to display real-time logs.

const MAX_LINES = 50;
const logBuffer: { timestamp: string; level: string; message: string }[] = [];

/**
 * Get a copy of the current log buffer.
 */
export function getLogBuffer(): typeof logBuffer {
  return [...logBuffer];
}

/**
 * Get buffer as formatted strings.
 */
export function getLogLines(): string[] {
  return logBuffer.map(
    (entry) => `[${entry.timestamp}] [${entry.level}] ${entry.message}`
  );
}

/**
 * Install console interceptors to capture logs into the buffer.
 * Original console functions still work — this is purely additive.
 */
export function installLogInterceptor(): void {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  const capture = (level: string, args: any[]) => {
    const timestamp = new Date().toISOString();
    const message = args
      .map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a)))
      .join(" ");

    logBuffer.push({ timestamp, level, message });

    // Keep buffer at max size
    while (logBuffer.length > MAX_LINES) {
      logBuffer.shift();
    }
  };

  console.log = (...args: any[]) => {
    capture("INFO", args);
    originalLog.apply(console, args);
  };

  console.error = (...args: any[]) => {
    capture("ERROR", args);
    originalError.apply(console, args);
  };

  console.warn = (...args: any[]) => {
    capture("WARN", args);
    originalWarn.apply(console, args);
  };
}
