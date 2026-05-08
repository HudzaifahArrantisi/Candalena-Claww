// src/notifiers/telegram.notifier.ts
// ─── Candalena Claw v5.0 — Telegram Notifier Adapter ───
// Refactored from daemon.ts sendTelegram/broadcastTelegram into INotifier pattern.
// Uses raw Node.js https (zero external dependencies).

import https from "https";
import { INotifier, NotificationPayload, SendResult } from "./notifier.interface";

export class TelegramNotifier implements INotifier {
  readonly channelName = "telegram";

  constructor(
    private botToken: string,
    private targets: string[]
  ) {}

  /**
   * Send a message to a single Telegram chat.
   * Returns SendResult with rate-limit detection for admin alerting.
   */
  async send(payload: NotificationPayload): Promise<SendResult> {
    if (!this.botToken) {
      console.error("[Telegram] ❌ Bot token not set!");
      return { success: false, error: "Bot token not set" };
    }

    const body = JSON.stringify({
      chat_id: payload.chatId,
      text: payload.message,
      parse_mode: payload.parseMode || "HTML",
      ...(payload.replyMarkup ? { reply_markup: payload.replyMarkup } : {}),
    });

    return new Promise((resolve) => {
      const req = https.request(
        {
          hostname: "api.telegram.org",
          path: `/bot${this.botToken}/sendMessage`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body),
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              const parsed = JSON.parse(data);

              // Rate-limit detection (HTTP 429)
              if (res.statusCode === 429) {
                const retryAfter = parsed.parameters?.retry_after || 30;
                console.error(`[Telegram] ⚠️ Rate limited! Retry after ${retryAfter}s`);
                resolve({
                  success: false,
                  rateLimited: true,
                  error: `Rate limited (retry after ${retryAfter}s)`,
                });
                return;
              }

              if (!parsed.ok) {
                console.error(`[Telegram] API error: ${parsed.description}`);
                resolve({ success: false, error: parsed.description });
              } else {
                resolve({ success: true });
              }
            } catch {
              console.error("[Telegram] Failed to parse response");
              resolve({ success: false, error: "Failed to parse response" });
            }
          });
        }
      );

      req.on("error", (err) => {
        console.error(`[Telegram] Network error: ${err.message}`);
        resolve({ success: false, error: err.message });
      });

      req.write(body);
      req.end();
    });
  }

  /**
   * Broadcast a message to ALL configured Telegram targets.
   */
  async broadcast(message: string): Promise<void> {
    if (this.targets.length === 0) {
      console.warn("[Telegram] ⚠️ No targets configured.");
      return;
    }

    for (const chatId of this.targets) {
      const result = await this.send({ chatId, message, parseMode: "HTML" });
      if (result.success) {
        console.log(`[Candalena] ✅ Sent → ${chatId}`);
      } else {
        console.error(`[Candalena] ❌ Failed → ${chatId}: ${result.error}`);
      }
    }
  }

  /**
   * Make a raw Telegram Bot API call (used by bot-listener for getUpdates, etc.)
   */
  async apiCall(method: string, body: Record<string, any> = {}): Promise<any> {
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
              const parsed = JSON.parse(data);
              resolve(parsed);
            } catch {
              reject(new Error("Failed to parse Telegram API response"));
            }
          });
        }
      );
      req.on("error", reject);
      req.write(bodyStr);
      req.end();
    });
  }

  /** Get the bot token (needed by bot-listener) */
  getToken(): string {
    return this.botToken;
  }

  /** Get configured targets */
  getTargets(): string[] {
    return [...this.targets];
  }
}
