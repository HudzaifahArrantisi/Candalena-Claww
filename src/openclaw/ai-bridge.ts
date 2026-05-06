// src/openclaw/ai-bridge.ts
// ─── Bridge to OpenClaw AI Local API ───
// Sends prompts to OpenClaw Gateway at port 18789 for schema analysis

import * as http from "http";
import { DatabaseDDL, AISchemaMapping } from "./types";
import { buildSchemaAnalysisPrompt, SYSTEM_PROMPT } from "./ai-prompt";

const OPENCLAW_API = "http://127.0.0.1:18789";

/**
 * Send a prompt to OpenClaw Gateway via WebSocket-style HTTP API
 * Uses the /hooks/wake endpoint for system-level interaction
 */
export async function sendToOpenClaw(
  message: string,
  systemPrompt?: string,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const payload = JSON.stringify({
      text: message,
      mode: "now",
      systemPrompt: systemPrompt || undefined,
    });

    const options: http.RequestOptions = {
      hostname: "127.0.0.1",
      port: 18789,
      path: "/hooks/wake",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    };

    const req = http.request(options, (res) => {
      let body = "";

      res.on("data", (chunk: Buffer) => {
        body += chunk.toString();
      });

      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body);
        } else {
          reject(new Error(`OpenClaw API returned ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on("error", (err) => {
      reject(new Error(`Failed to connect to OpenClaw at ${OPENCLAW_API}: ${err.message}`));
    });

    req.setTimeout(120_000, () => {
      req.destroy();
      reject(new Error("OpenClaw API request timed out (120s)"));
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Send database DDL to OpenClaw AI for analysis
 * Returns the AI's schema mapping response
 */
export async function analyzeSchemaWithAI(
  ddl: DatabaseDDL,
): Promise<AISchemaMapping | null> {
  const prompt = buildSchemaAnalysisPrompt(ddl);

  try {
    const response = await sendToOpenClaw(prompt, SYSTEM_PROMPT);

    // Try to parse the JSON mapping from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const mapping = JSON.parse(jsonMatch[0]) as AISchemaMapping;
        return mapping;
      } catch (parseErr) {
        return null;
      }
    }

    return null;
  } catch (err: any) {
    return null;
  }
}

/**
 * Check if OpenClaw Gateway is reachable
 */
export async function isGatewayReachable(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const net = require("net");
    const socket = new net.Socket();
    
    socket.setTimeout(1000);
    
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on("error", () => {
      resolve(false);
    });
    
    socket.connect(18789, "127.0.0.1");
  });
}

/**
 * Send a direct Telegram message via OpenClaw Gateway
 */
export async function sendTelegramViaOpenClaw(
  chatId: string,
  message: string,
): Promise<void> {
  const payload = JSON.stringify({
    text: `Send this message to Telegram group ${chatId}:\n\n${message}`,
    mode: "now",
  });

  return new Promise<void>((resolve, reject) => {
    const options: http.RequestOptions = {
      hostname: "127.0.0.1",
      port: 18789,
      path: "/hooks/wake",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    };

    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk: Buffer) => { body += chunk.toString(); });
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`Telegram send failed: ${res.statusCode} ${body}`));
        }
      });
    });

    req.on("error", (err) => reject(err));
    req.setTimeout(30_000, () => {
      req.destroy();
      reject(new Error("Telegram send timed out"));
    });

    req.write(payload);
    req.end();
  });
}
