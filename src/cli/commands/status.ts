// src/cli/commands/status.ts
// ─── candalena-claw status ───

import { printBanner, printHeader, printOk, printWarn, printFail, printBlank, brand, createSpinner, icon, requireSetup } from "../ui";
import * as fs from "fs";
import * as path from "path";

export async function statusCommand(): Promise<void> {
  if (!requireSetup()) return;
  printBanner();
  printHeader("System Status");

  require("dotenv").config();
  const { ENV } = require("../../config/env");
  const checks: { name: string; status: "ok"|"warn"|"fail"; detail: string }[] = [];

  // Engine process
  const pidPath = path.resolve(process.cwd(), ".candalena", "engine.pid");
  if (fs.existsSync(pidPath)) {
    const pid = fs.readFileSync(pidPath, "utf-8").trim();
    try { process.kill(parseInt(pid,10), 0); checks.push({ name:"Engine", status:"ok", detail:`Running (PID: ${pid})` }); }
    catch { checks.push({ name:"Engine", status:"fail", detail:"PID file stale" }); }
  } else {
    checks.push({ name:"Engine", status:"warn", detail:"Not running" });
  }

  // Database
  const sp = createSpinner("Checking database...");
  sp.start();
  try {
    const { createAdapter } = require("../../adapters/adapter.factory");
    await createAdapter().testConnection();
    sp.stop();
    checks.push({ name:"Database", status:"ok", detail:`${ENV.DB_TYPE} @ ${ENV.DB_HOST}` });
  } catch(e:any) { sp.stop(); checks.push({ name:"Database", status:"fail", detail:e.message||"Failed" }); }

  // Scheduler
  checks.push({ name:"Scheduler", status: ENV.CRON_SCHEDULE?"ok":"warn", detail: ENV.CRON_SCHEDULE||"Not set" });

  // Telegram
  if (ENV.TELEGRAM_BOT_TOKEN) {
    const ts = createSpinner("Checking Telegram...");
    ts.start();
    try {
      const n = await checkBot(ENV.TELEGRAM_BOT_TOKEN);
      ts.stop(); checks.push({ name:"Telegram Bot", status:"ok", detail:`@${n}` });
    } catch { ts.stop(); checks.push({ name:"Telegram Bot", status:"fail", detail:"Invalid token" }); }
  } else { checks.push({ name:"Telegram Bot", status:"warn", detail:"No token" }); }

  checks.push({ name:"Config", status: fs.existsSync(path.resolve(process.cwd(),".env"))?"ok":"fail", detail:".env" });

  printBlank();
  for (const c of checks) {
    const ic = c.status==="ok"?icon.ok:c.status==="warn"?icon.warn:icon.fail;
    const cl = c.status==="ok"?brand.success:c.status==="warn"?brand.warning:brand.error;
    console.log(`  ${ic} ${brand.bold(c.name.padEnd(16))} ${cl(c.detail)}`);
  }
  printBlank();
  const f = checks.filter(c=>c.status==="fail").length;
  if(f>0) printFail(`${f} issue(s). Run ${brand.primary("candalena-claw doctor")}`);
  else printOk(brand.success.bold("All systems operational."));
  printBlank();
}

async function checkBot(token:string):Promise<string> {
  return new Promise((resolve,reject)=>{
    const https=require("https");
    https.get(`https://api.telegram.org/bot${token}/getMe`,(res:any)=>{
      let d=""; res.on("data",(c:string)=>d+=c);
      res.on("end",()=>{ try{const p=JSON.parse(d);p.ok?resolve(p.result.username):reject();}catch{reject();}});
    }).on("error",reject);
  });
}
