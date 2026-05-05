// src/cli/commands/update.ts
// ─── candalena-claw update ───

import { printBanner, printHeader, printOk, printWarn, printFail, printBlank, printLine, brand, createSpinner, getVersion } from "../ui";
import { execSync } from "child_process";

export async function updateCommand(): Promise<void> {
  printBanner();
  printHeader("Check for Updates");

  const current = getVersion();
  printLine(`Current version: ${brand.primary("v" + current)}`);
  printBlank();

  const spinner = createSpinner("Checking npm registry...");
  spinner.start();

  try {
    const latest = execSync("npm view candalena-claw version 2>/dev/null", { encoding: "utf-8" }).trim();
    spinner.stop();

    if (!latest) {
      printWarn("Package not published to npm yet.");
      printBlank();
      printLine(brand.muted("Publish with: npm publish"));
      printBlank();
      return;
    }

    if (latest === current) {
      printOk(brand.success.bold(`Already on latest version (v${current})`));
      printBlank();
      return;
    }

    printLine(`Latest version: ${brand.success("v" + latest)}`);
    printBlank();

    const updateSpinner = createSpinner("Updating...");
    updateSpinner.start();

    try {
      execSync("npm install -g candalena-claw@latest", { encoding: "utf-8" });
      updateSpinner.succeed(brand.success(`  Updated to v${latest}`));
    } catch {
      updateSpinner.fail(brand.error("  Update failed"));
      printBlank();
      printLine(`Try manually: ${brand.secondary("npm install -g candalena-claw@latest")}`);
    }
  } catch {
    spinner.stop();
    printWarn("Could not check npm registry.");
    printBlank();
    printLine(brand.muted("Package may not be published yet."));
  }
  printBlank();
}
