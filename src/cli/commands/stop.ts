// src/cli/commands/stop.ts
// ─── candalena-claw stop ───
// Stops any running engine process

import {
  printBanner,
  printHeader,
  printOk,
  printWarn,
  printBlank,
  printLine,
  brand,
  createSpinner,
} from "../ui";
import * as fs from "fs";
import * as path from "path";

export async function stopCommand(): Promise<void> {
  printBanner();
  printHeader("Stopping Engine");

  const pidPath = path.resolve(process.cwd(), ".candalena", "engine.pid");

  if (!fs.existsSync(pidPath)) {
    printWarn("No running engine detected.");
    printBlank();
    printLine(brand.muted("The engine may not have been started, or was started in foreground mode."));
    printBlank();
    return;
  }

  const pid = fs.readFileSync(pidPath, "utf-8").trim();

  const spinner = createSpinner(`Stopping process (PID: ${pid})...`);
  spinner.start();

  try {
    process.kill(parseInt(pid, 10), "SIGTERM");
    fs.unlinkSync(pidPath);
    spinner.succeed(brand.success(`  Engine stopped (PID: ${pid})`));
  } catch (err: any) {
    spinner.fail(brand.error("  Failed to stop engine"));
    if (err.code === "ESRCH") {
      printWarn("Process not found — it may have already stopped.");
      fs.unlinkSync(pidPath);
    } else {
      printLine(brand.muted(`Error: ${err.message}`));
    }
  }

  printBlank();
  printOk("Engine stopped.");
  printBlank();
}
