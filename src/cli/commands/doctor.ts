// src/cli/commands/doctor.ts
// ─── candalena-claw doctor ───

import { printBanner, printHeader, printOk, printWarn, printFail, printBlank, printLine, brand, createSpinner, icon, requireSetup } from "../ui";
import * as fs from "fs";
import * as path from "path";

interface DiagResult { name: string; status: "ok"|"warn"|"fail"; detail: string; fix?: string }

export async function doctorCommand(): Promise<void> {
  printBanner();
  printHeader("System Diagnostics");

  const results: DiagResult[] = [];

  // 1. Node version
  const nv = process.version;
  const major = parseInt(nv.replace("v",""),10);
  results.push(major>=16
    ? { name:"Node.js", status:"ok", detail:nv }
    : { name:"Node.js", status:"fail", detail:`${nv} — requires v16+`, fix:"Install Node.js 16+ from https://nodejs.org" });

  // 2. .env file
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    results.push({ name:"Configuration", status:"ok", detail:".env found" });
    require("dotenv").config();
  } else {
    results.push({ name:"Configuration", status:"fail", detail:".env missing", fix:"Run: candalena-claw init" });
    printDiag(results);
    return;
  }

  const { ENV } = require("../../config/env");

  // 3. Database
  const dbs = createSpinner("Testing database...");
  dbs.start();
  try {
    const { createAdapter } = require("../../adapters/adapter.factory");
    const adapter = createAdapter();
    await adapter.testConnection();
    dbs.stop();
    results.push({ name:"Database", status:"ok", detail:`${ENV.DB_TYPE} connected` });

    // 4. Table
    try {
      const schema = await adapter.detectSchema(ENV.TABLE_NAME||"tugas");
      results.push({ name:"Table", status:"ok", detail:`"${ENV.TABLE_NAME}" found` });

      // 5. Column mapping
      const required = ["title","deadline"] as const;
      for (const col of required) {
        if (schema[col]) {
          results.push({ name:`Column: ${col}`, status:"ok", detail:`→ ${schema[col]}` });
        } else {
          results.push({ name:`Column: ${col}`, status:"warn", detail:"Not mapped",
            fix:`Set COL_${col.toUpperCase()} in .env or add column to table` });
        }
      }
      if (schema.telegramChannel) {
        results.push({ name:"Column: telegram", status:"ok", detail:`→ ${schema.telegramChannel}` });
      } else {
        results.push({ name:"Column: telegram", status:"warn", detail:"Not mapped",
          fix:"Set COL_TELEGRAM in .env" });
      }
    } catch {
      results.push({ name:"Table", status:"fail", detail:`"${ENV.TABLE_NAME}" not found`,
        fix:`Create the table or update TABLE_NAME in .env` });
    }
  } catch(e:any) {
    dbs.stop();
    results.push({ name:"Database", status:"fail", detail:e.message||"Failed",
      fix:"Check DB_HOST, DB_PORT, DB_USER, DB_PASS in .env" });
  }

  // 6. Telegram
  if (ENV.TELEGRAM_BOT_TOKEN) {
    const ts = createSpinner("Validating Telegram...");
    ts.start();
    try {
      const name = await checkBot(ENV.TELEGRAM_BOT_TOKEN);
      ts.stop();
      results.push({ name:"Telegram Bot", status:"ok", detail:`@${name}` });
    } catch {
      ts.stop();
      results.push({ name:"Telegram Bot", status:"fail", detail:"Invalid token",
        fix:"Get a valid token from @BotFather on Telegram" });
    }
  } else {
    results.push({ name:"Telegram Bot", status:"warn", detail:"No token",
      fix:"Set TELEGRAM_BOT_TOKEN in .env" });
  }

  // 7. Cron
  const cronPkg = require("node-cron");
  if (ENV.CRON_SCHEDULE && cronPkg.validate(ENV.CRON_SCHEDULE)) {
    results.push({ name:"Cron Schedule", status:"ok", detail:ENV.CRON_SCHEDULE });
  } else {
    results.push({ name:"Cron Schedule", status:"fail", detail:`Invalid: ${ENV.CRON_SCHEDULE}`,
      fix:"Use a valid cron expression, e.g. */5 * * * *" });
  }

  printDiag(results);
}

function printDiag(results: DiagResult[]) {
  printBlank();
  for (const r of results) {
    const ic = r.status==="ok"?icon.ok:r.status==="warn"?icon.warn:icon.fail;
    const cl = r.status==="ok"?brand.success:r.status==="warn"?brand.warning:brand.error;
    console.log(`  ${ic} ${brand.bold(r.name.padEnd(20))} ${cl(r.detail)}`);
    if (r.fix) printLine(`${brand.muted("   Fix:")} ${r.fix}`, 4);
  }
  printBlank();
  const ok = results.filter(r=>r.status==="ok").length;
  const warn = results.filter(r=>r.status==="warn").length;
  const fail = results.filter(r=>r.status==="fail").length;
  console.log(`  ${brand.success(`${ok} passed`)}  ${brand.warning(`${warn} warnings`)}  ${brand.error(`${fail} errors`)}`);
  printBlank();
}

async function checkBot(token:string):Promise<string> {
  return new Promise((resolve,reject)=>{
    const https=require("https");
    https.get(`https://api.telegram.org/bot${token}/getMe`,(res:any)=>{
      let d="";res.on("data",(c:string)=>d+=c);
      res.on("end",()=>{try{const p=JSON.parse(d);p.ok?resolve(p.result.username):reject();}catch{reject();}});
    }).on("error",reject);
  });
}
