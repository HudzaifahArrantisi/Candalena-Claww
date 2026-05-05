// src/index.ts
import { startServer } from "./server";
import { startEngine } from "./core/engine";

async function main() {
  try {
    startServer();
    await startEngine();
  } catch (err: any) {
    console.error("[OpenClaw] ❌ Fatal error:", err.message);
    process.exit(1);
  }
}

main();