// src/telegram/bot.ts
import https from "https";

/**
 * Send message via Telegram Bot API using raw HTTPS (zero dependencies)
 * Returns true on success, false on failure
 */
export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  message: string
): Promise<boolean> {
  const body = JSON.stringify({
    chat_id: chatId,
    text: message,
    parse_mode: "HTML",
  });

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: "api.telegram.org",
        path: `/bot${botToken}/sendMessage`,
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
            if (!parsed.ok) {
              console.error(`[Telegram] API error: ${parsed.description}`);
              resolve(false);
            } else {
              resolve(true);
            }
          } catch {
            console.error("[Telegram] Failed to parse response");
            resolve(false);
          }
        });
      }
    );
    req.on("error", (err) => {
      console.error(`[Telegram] Network error: ${err.message}`);
      resolve(false);
    });
    req.write(body);
    req.end();
  });
}