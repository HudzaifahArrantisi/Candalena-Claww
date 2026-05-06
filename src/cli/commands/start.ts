// src/cli/commands/start.ts
// ─── candalena-claw start ───
// Spawns the standalone background daemon

import { spawn } from "child_process";
import path from "path";
import boxen from "boxen";
import {
  printBanner,
  printHeader,
  printBlank,
  brand,
  requireSetup,
  getVersion,
} from "../ui";

export async function startCommand(): Promise<void> {
  // Pastikan user sudah setup .env sebelum menjalankan
  if (!requireSetup()) return;

  printBanner();
  printHeader("Starting Candalena Claw Daemon");

  const statusLines = [
    `${brand.primary.bold("Candalena Claw")} ${brand.muted("v" + getVersion())}`,
    "",
    `${brand.success("●")} System initialized`,
    `${brand.success("●")} Handing over control to standalone daemon...`,
    "",
    `${brand.muted("Logs will stream below. Press")} ${brand.bold("Ctrl+C")} ${brand.muted("to stop.")}`,
  ];

  console.log(
    boxen(statusLines.join("\n"), {
      padding: { top: 0, bottom: 0, left: 2, right: 2 },
      borderColor: "magenta",
      borderStyle: "round",
      title: " Launching Daemon ",
      titleAlignment: "center",
    })
  );
  printBlank();

  // Mencari file daemon hasil kompilasi (berada di dist/engine/daemon.js)
  const daemonPath = path.resolve(__dirname, "../../engine/daemon.js");

  // Spawn node process dengan stdio 'inherit' agar UI/log daemon tampil utuh
  const child = spawn("node", [daemonPath], {
    stdio: "inherit",
    env: process.env, // Teruskan .env
  });

  child.on("error", (err) => {
    console.error(brand.error(`\n❌ Failed to start daemon: ${err.message}`));
  });

  child.on("exit", (code) => {
    if (code !== 0) {
      console.log(brand.error(`\n⚠️ Daemon exited with code ${code}`));
    } else {
      console.log(brand.success(`\n✅ Daemon stopped gracefully.`));
    }
  });
}
