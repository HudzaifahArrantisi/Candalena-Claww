// src/notifiers/whatsapp.notifier.ts
// ─── Candalena Claw v5.0 — WhatsApp Notifier Stub ───
// Future-ready adapter. Implement with Baileys or whatsapp-web.js when needed.

import { INotifier, NotificationPayload, SendResult } from "./notifier.interface";

export class WhatsAppNotifier implements INotifier {
  readonly channelName = "whatsapp";

  async send(payload: NotificationPayload): Promise<SendResult> {
    console.warn("[WhatsApp] ⚠️ WhatsApp notifier not yet implemented.");
    console.warn("[WhatsApp]    Install 'baileys' or 'whatsapp-web.js' and implement this adapter.");
    return { success: false, error: "WhatsApp notifier not implemented" };
  }

  async broadcast(message: string): Promise<void> {
    console.warn("[WhatsApp] ⚠️ WhatsApp broadcast not yet implemented.");
  }
}
