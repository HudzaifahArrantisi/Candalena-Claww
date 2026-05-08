// src/notifiers/notifier.interface.ts
// ─── Candalena Claw v5.0 — Multi-Channel Notifier Interface ───
// All notification channels (Telegram, WhatsApp, etc.) must implement this.

export interface NotificationPayload {
  chatId: string;
  message: string;
  parseMode?: "HTML" | "Markdown";
  replyMarkup?: any; // For inline keyboards (Telegram)
}

export interface SendResult {
  success: boolean;
  rateLimited?: boolean;
  error?: string;
}

export interface INotifier {
  /** Channel name: "telegram", "whatsapp", etc. */
  readonly channelName: string;

  /** Send a message to a single target */
  send(payload: NotificationPayload): Promise<SendResult>;

  /** Broadcast to all configured targets */
  broadcast(message: string): Promise<void>;

  /** Stop/cleanup */
  close?(): Promise<void>;
}
