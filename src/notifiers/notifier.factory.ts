// src/notifiers/notifier.factory.ts
// ─── Candalena Claw v5.0 — Notifier Factory ───
// Reads NOTIFIER_CHANNELS from .env and creates the appropriate notifier(s).
// Singleton pattern — only one set of notifiers per process.

import { INotifier } from "./notifier.interface";
import { TelegramNotifier } from "./telegram.notifier";
import { WhatsAppNotifier } from "./whatsapp.notifier";

let cachedNotifiers: INotifier[] = [];
let telegramInstance: TelegramNotifier | null = null;

export interface NotifierConfig {
  channels: string;        // comma-separated: "telegram", "whatsapp", "telegram,whatsapp"
  telegramToken: string;
  telegramTargets: string[];
}

/**
 * Create notifiers based on config. Singleton — only creates once.
 */
export function createNotifiers(config: NotifierConfig): INotifier[] {
  if (cachedNotifiers.length > 0) return cachedNotifiers;

  const channels = config.channels
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);

  // Default to telegram if no channels specified
  if (channels.length === 0) channels.push("telegram");

  for (const ch of channels) {
    switch (ch) {
      case "telegram":
        telegramInstance = new TelegramNotifier(config.telegramToken, config.telegramTargets);
        cachedNotifiers.push(telegramInstance);
        console.log(`[Candalena] 📡 Notifier registered: Telegram (${config.telegramTargets.length} target(s))`);
        break;

      case "whatsapp":
        cachedNotifiers.push(new WhatsAppNotifier());
        console.log(`[Candalena] 📡 Notifier registered: WhatsApp (stub)`);
        break;

      default:
        console.warn(`[Candalena] ⚠️ Unknown notifier channel: "${ch}" — skipped.`);
    }
  }

  if (cachedNotifiers.length === 0) {
    console.error("[Candalena] ❌ No valid notifier channels configured!");
  }

  return cachedNotifiers;
}

/**
 * Get all active notifiers (must call createNotifiers first)
 */
export function getNotifiers(): INotifier[] {
  return cachedNotifiers;
}

/**
 * Get the Telegram notifier instance directly (for bot-listener, admin alerts, etc.)
 */
export function getTelegramNotifier(): TelegramNotifier | null {
  return telegramInstance;
}

/**
 * Broadcast a message through ALL active notification channels.
 */
export async function broadcastAll(message: string): Promise<void> {
  for (const notifier of cachedNotifiers) {
    await notifier.broadcast(message);
  }
}
