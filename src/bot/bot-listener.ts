// src/bot/bot-listener.ts
// ─── Candalena Claw v5.0 — Telegram Long-Polling Bot Listener ───
// Runs alongside cron jobs without blocking. Uses raw HTTPS (no telegraf/node-telegram-bot-api).
// Listens for /tugas, /help, /start commands and inline keyboard callbacks.

import https from "https";
import {
  handleTugasCommand,
  handleHelpCommand,
  handleStartCommand,
  dismissTask,
} from "./bot-handlers";

export class BotListener {
  private offset = 0;
  private running = false;
  private pollTimeout = 30; // Long-polling timeout in seconds

  constructor(
    private botToken: string,
    private tableName: string,
    private timezone: string = "Asia/Jakarta"
  ) {}

  /**
   * Start the long-polling listener. Non-blocking — runs in a background loop.
   */
  async start(): Promise<void> {
    this.running = true;
    console.log("[Candalena] 🤖 Interactive bot listener started (long-polling)");

    // Set bot commands for the menu
    await this.setBotCommands();

    // Start polling loop (non-blocking)
    this.pollLoop();
  }

  /**
   * Stop the polling listener gracefully.
   */
  stop(): void {
    this.running = false;
    console.log("[Candalena] 🤖 Bot listener stopped.");
  }

  // ═══════════════════════════════════════════
  // Polling Loop
  // ═══════════════════════════════════════════

  private async pollLoop(): Promise<void> {
    while (this.running) {
      try {
        const updates = await this.getUpdates();

        for (const update of updates) {
          this.offset = update.update_id + 1;

          // Process each update without blocking the loop
          this.handleUpdate(update).catch((err) => {
            console.error("[Bot] Error handling update:", err.message);
          });
        }
      } catch (err: any) {
        if (this.running) {
          console.error("[Bot] Polling error:", err.message);
          await this.sleep(5000); // Backoff on error
        }
      }
    }
  }

  // ═══════════════════════════════════════════
  // Update Handler
  // ═══════════════════════════════════════════

  private async handleUpdate(update: any): Promise<void> {
    // ── Text commands ──
    if (update.message?.text) {
      const chatId = update.message.chat.id.toString();
      const text = update.message.text.trim().toLowerCase();
      const botUsername = text.includes("@") ? text.split("@")[1] : "";

      if (text === "/tugas" || text.startsWith("/tugas@")) {
        const response = await handleTugasCommand(this.tableName, this.timezone);
        await this.sendMessage(chatId, response);
      } else if (text === "/help" || text.startsWith("/help@")) {
        const response = handleHelpCommand();
        await this.sendMessage(chatId, response);
      } else if (text === "/start" || text.startsWith("/start@")) {
        const response = handleStartCommand();
        await this.sendMessage(chatId, response);
      }
    }

    // ── Inline keyboard callback queries ──
    if (update.callback_query) {
      const data = update.callback_query.data;
      const chatId = update.callback_query.message?.chat?.id?.toString();
      const callbackId = update.callback_query.id;

      if (data?.startsWith("dismiss:") && chatId) {
        const taskId = data.split(":")[1];
        dismissTask(chatId, taskId);
        await this.answerCallback(callbackId, "✅ Pengingat untuk tugas ini dihentikan");

        // Edit the original message to show it's been dismissed
        const messageId = update.callback_query.message?.message_id;
        if (messageId) {
          await this.editMessage(
            chatId,
            messageId,
            update.callback_query.message.text + "\n\n✅ <i>Ditandai selesai</i>"
          );
        }
      }
    }
  }

  // ═══════════════════════════════════════════
  // Telegram API Helpers
  // ═══════════════════════════════════════════

  private async getUpdates(): Promise<any[]> {
    const body = {
      offset: this.offset,
      timeout: this.pollTimeout,
      allowed_updates: ["message", "callback_query"],
    };

    const result = await this.apiCall("getUpdates", body);
    return result?.result || [];
  }

  private async sendMessage(chatId: string, text: string, replyMarkup?: any): Promise<void> {
    await this.apiCall("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    });
  }

  private async editMessage(chatId: string, messageId: number, text: string): Promise<void> {
    await this.apiCall("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
    });
  }

  private async answerCallback(callbackQueryId: string, text: string): Promise<void> {
    await this.apiCall("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      text,
      show_alert: false,
    });
  }

  private async setBotCommands(): Promise<void> {
    await this.apiCall("setMyCommands", {
      commands: [
        { command: "tugas", description: "Lihat daftar tugas aktif" },
        { command: "help", description: "Panduan penggunaan bot" },
        { command: "start", description: "Mulai menggunakan bot" },
      ],
    });
    console.log("[Bot] ✅ Bot commands menu registered.");
  }

  // ═══════════════════════════════════════════
  // Raw HTTPS Helper
  // ═══════════════════════════════════════════

  private apiCall(method: string, body: Record<string, any> = {}): Promise<any> {
    const bodyStr = JSON.stringify(body);

    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: "api.telegram.org",
          path: `/bot${this.botToken}/${method}`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(bodyStr),
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              resolve(JSON.parse(data));
            } catch {
              reject(new Error(`Failed to parse ${method} response`));
            }
          });
        }
      );

      req.on("error", reject);
      req.write(bodyStr);
      req.end();
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
