// src/cli/commands/reset.ts
// ─── candalena-claw reset ───

import { printBanner, printHeader, printOk, printWarn, printBlank, printLine, brand, confirm, icon } from "../ui";
import * as fs from "fs";
import * as path from "path";

export async function resetCommand(): Promise<void> {
  printBanner();
  printHeader("Reset Installation");

  printLine(brand.warning.bold("This will delete all configuration and cached data:"));
  printBlank();
  printLine(`  ${brand.muted("•")} .env`);
  printLine(`  ${brand.muted("•")} .candalena/ (cache & session)`);
  printLine(`  ${brand.muted("•")} logs/`);
  printBlank();

  const yes = await confirm("Are you sure?");
  if (!yes) {
    printBlank();
    printLine(brand.muted("Reset cancelled."));
    printBlank();
    return;
  }

  const cwd = process.cwd();
  const targets = [
    { path: path.join(cwd, ".env"), type: "file" },
    { path: path.join(cwd, ".candalena"), type: "dir" },
    { path: path.join(cwd, "logs"), type: "dir" },
  ];

  for (const t of targets) {
    if (fs.existsSync(t.path)) {
      if (t.type === "dir") {
        fs.rmSync(t.path, { recursive: true, force: true });
      } else {
        fs.unlinkSync(t.path);
      }
      printOk(`Removed ${path.basename(t.path)}`);
    } else {
      printWarn(`${path.basename(t.path)} not found — skipping`);
    }
  }

  printBlank();
  printOk(brand.success.bold("Reset complete."));
  printBlank();
  printLine(`Run ${brand.primary("candalena-claw init")} to start fresh.`);
  printBlank();
}
