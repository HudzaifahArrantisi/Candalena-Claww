// src/cli/commands/logs.ts
// ─── candalena-claw logs ───

import { printBanner, printHeader, printWarn, printBlank, printLine, brand } from "../ui";
import * as fs from "fs";
import * as path from "path";

export async function logsCommand(): Promise<void> {
  printBanner();
  printHeader("Realtime Logs");

  const logDir = path.resolve(process.cwd(), "logs");
  const logFile = path.join(logDir, "engine.log");

  if (!fs.existsSync(logFile)) {
    printWarn("No log file found.");
    printBlank();
    printLine(brand.muted("Logs are created when the engine runs."));
    printLine(`Start the engine: ${brand.primary("candalena-claw start")}`);
    printBlank();
    return;
  }

  // Show last 50 lines then tail
  printLine(brand.muted("Streaming logs... Press Ctrl+C to stop."));
  printBlank();

  const content = fs.readFileSync(logFile, "utf-8");
  const lines = content.split("\n");
  const tail = lines.slice(-50);
  for (const line of tail) {
    if (line.trim()) printLogLine(line);
  }

  // Watch for new lines
  let lastSize = fs.statSync(logFile).size;
  const watcher = fs.watchFile(logFile, { interval: 500 }, () => {
    const stat = fs.statSync(logFile);
    if (stat.size > lastSize) {
      const fd = fs.openSync(logFile, "r");
      const buf = Buffer.alloc(stat.size - lastSize);
      fs.readSync(fd, buf, 0, buf.length, lastSize);
      fs.closeSync(fd);
      const newLines = buf.toString("utf-8").split("\n");
      for (const line of newLines) {
        if (line.trim()) printLogLine(line);
      }
      lastSize = stat.size;
    }
  });

  // Keep alive until Ctrl+C
  process.on("SIGINT", () => {
    fs.unwatchFile(logFile);
    printBlank();
    printLine(brand.muted("Log stream ended."));
    printBlank();
    process.exit(0);
  });

  // Block
  await new Promise(() => {});
}

function printLogLine(line: string): void {
  if (line.includes("ERROR") || line.includes("❌")) {
    console.log(`  ${brand.error(line)}`);
  } else if (line.includes("WARN") || line.includes("⚠")) {
    console.log(`  ${brand.warning(line)}`);
  } else if (line.includes("✅") || line.includes("OK")) {
    console.log(`  ${brand.success(line)}`);
  } else {
    console.log(`  ${brand.muted(line)}`);
  }
}
