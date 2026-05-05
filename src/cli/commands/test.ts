// src/cli/commands/test.ts
// ─── candalena-claw test ───

import { printBanner, printHeader, printOk, printFail, printBlank, printLine, brand, createSpinner, requireSetup, handleError } from "../ui";

export async function testCommand(): Promise<void> {
  if (!requireSetup()) return;
  printBanner();
  printHeader("Send Test Reminder");

  require("dotenv").config();
  const { ENV } = require("../../config/env");

  if (!ENV.TELEGRAM_BOT_TOKEN) {
    printFail("TELEGRAM_BOT_TOKEN not configured.");
    printBlank();
    printLine(`Run ${brand.primary("candalena-claw setup")} to configure.`);
    printBlank();
    return;
  }

  // Try to get a channel from DB or ask user
  const readline = require("readline");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const chatId: string = await new Promise((resolve) => {
    rl.question(`  ${brand.secondary("?")} Telegram Chat/Channel ID ${brand.primary("›")} `, (a: string) => {
      rl.close();
      resolve(a.trim());
    });
  });

  if (!chatId) {
    printFail("No chat ID provided.");
    printBlank();
    return;
  }

  const spinner = createSpinner("Sending test message...");
  spinner.start();

  try {
    const { sendTelegramMessage } = require("../../telegram/bot");
    const msg = [
      "🧪 <b>TEST REMINDER</b>",
      "━━━━━━━━━━━━━━━━━━",
      "📝 This is a test message from Candalena Claw.",
      "",
      `🕐 ${new Date().toLocaleString()}`,
      "🤖 <i>Candalena Claw Engine</i>",
    ].join("\n");

    const ok = await sendTelegramMessage(ENV.TELEGRAM_BOT_TOKEN, chatId, msg);
    if (ok) {
      spinner.succeed(brand.success("  Test message sent!"));
      printBlank();
      printOk(`Message delivered to ${chatId}`);
    } else {
      spinner.fail(brand.error("  Failed to send message"));
      printBlank();
      printLine(brand.muted("Check your bot token and chat ID."));
    }
  } catch (err: any) {
    spinner.fail(brand.error("  Error sending message"));
    handleError(err);
  }
  printBlank();
}
