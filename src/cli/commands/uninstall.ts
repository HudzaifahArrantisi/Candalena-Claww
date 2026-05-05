// src/cli/commands/uninstall.ts
// ─── candalena-claw uninstall ───

import { printBanner, printHeader, printOk, printWarn, printBlank, printLine, brand, confirm, createSpinner } from "../ui";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

export async function uninstallCommand(): Promise<void> {
  printBanner();
  printHeader("Uninstall Candalena Claw");

  printLine(brand.warning.bold("This will completely remove Candalena Claw from your system:"));
  printBlank();
  printLine(`  ${brand.muted("1.")} Stop any running engine process`);
  printLine(`  ${brand.muted("2.")} Delete configuration (.env, .candalena, logs)`);
  printLine(`  ${brand.muted("3.")} Uninstall the global npm package`);
  printBlank();

  const yes = await confirm("Are you absolutely sure you want to uninstall?");
  if (!yes) {
    printBlank();
    printLine(brand.muted("Uninstall cancelled."));
    printBlank();
    return;
  }

  printBlank();
  
  // 1. Stop engine
  const pidPath = path.resolve(process.cwd(), ".candalena", "engine.pid");
  if (fs.existsSync(pidPath)) {
    try {
      const pid = fs.readFileSync(pidPath, "utf-8").trim();
      process.kill(parseInt(pid, 10), "SIGTERM");
      printOk(`Stopped running engine (PID: ${pid})`);
    } catch {
      printWarn("Could not stop engine (may already be stopped)");
    }
  }

  // 2. Clean files
  const cwd = process.cwd();
  const targets = [
    { path: path.join(cwd, ".env"), type: "file" },
    { path: path.join(cwd, ".candalena"), type: "dir" },
    { path: path.join(cwd, "logs"), type: "dir" },
  ];

  for (const t of targets) {
    if (fs.existsSync(t.path)) {
      if (t.type === "dir") fs.rmSync(t.path, { recursive: true, force: true });
      else fs.unlinkSync(t.path);
      printOk(`Removed ${path.basename(t.path)}`);
    }
  }

  // 3. Uninstall globally
  printBlank();
  const spinner = createSpinner("Uninstalling global npm package...");
  spinner.start();
  
  try {
    // Pada Windows, menghapus file yang sedang berjalan mungkin memunculkan warning,
    // tapi npm uninstall -g biasanya bisa menangani ini dengan baik.
    execSync("npm uninstall -g candalena-claw", { stdio: "ignore" });
    spinner.succeed(brand.success("  Global package uninstalled successfully"));
    printBlank();
    printOk("Candalena Claw has been completely removed.");
    printBlank();
    printLine(brand.muted("Goodbye! 🦞"));
    printBlank();
  } catch (err) {
    spinner.fail(brand.error("  Could not uninstall global package automatically"));
    printBlank();
    printLine(brand.muted("Please run this command manually to finish uninstallation:"));
    printLine(`  ${brand.primary("npm uninstall -g candalena-claw")}`);
    printBlank();
  }
}
