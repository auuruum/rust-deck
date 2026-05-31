import { EventEmitter } from "events";
import WebSocket from "ws";

/**
 * Central WebSocket client for Rust-Deck that auto-reconnects and re-emits
 * server update messages to Stream Deck actions.
 */
export interface UpdateMessage {
  type: "update" | "immediate_update";
  guildId?: string;
  data: Record<string, unknown>;
}

interface ConnectionOptions {
  url: string;
  guildId: string;
  endpoints: string[];
  apiPassword: string;
}

class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readonly reconnectDelay = 5000;
  private readonly defaultUrl = "ws://localhost:8074";
  private connected = false;
  private subscribed = false;
  private options: ConnectionOptions = {
    url: this.defaultUrl,
    guildId: "default",
    endpoints: ["server", "time", "pop", "switches", "alarms", "switchgroups", "storagemonitors", "trackers"],
    apiPassword: "",
  };

  connect(
    url?: string,
    guildId = "default",
    endpoints: string[] = ["server", "time", "pop", "switches", "alarms", "switchgroups", "storagemonitors", "trackers"],
    apiPassword = "",
  ): void {
    const targetUrl = url?.trim() || this.defaultUrl;
    const nextOptions = { url: targetUrl, guildId, endpoints, apiPassword };

    if (this.ws && this.options.url !== targetUrl) {
      this.disconnect();
    }

    this.options = nextOptions;

    if (this.ws) {
      return;
    }

    try {
      this.ws = new WebSocket(targetUrl);
    } catch (err) {
      console.error("WebSocket initialisation failed:", err);
      this.scheduleReconnect();
      return;
    }

    const socket = this.ws;

    socket.on("open", () => {
      this.connected = true;
      this.subscribed = false;
      try {
        socket.send(JSON.stringify({
          type: "subscribe",
          guildId,
          endpoints,
          apiPassword,
        }));
        this.subscribed = true;
        this.emit("status", { connected: this.connected, subscribed: this.subscribed });
      } catch (err) {
        console.error("Failed to send subscription message:", err);
      }
    });

    socket.on("message", (data) => {
      let payload: UpdateMessage | null = null;
      try {
        payload = JSON.parse(data.toString());
      } catch (err) {
        console.error("Invalid WS JSON:", err);
        return;
      }

      if (!payload || (payload.type !== "update" && payload.type !== "immediate_update")) {
        return;
      }

      for (const key of Object.keys(payload.data || {})) {
        this.emit(key, (payload.data as Record<string, unknown>)[key]);
      }
      this.emit("update", payload.data);
    });

    socket.on("error", (err: Error) => {
      console.error("WebSocket error:", err);
      this.emit("status", { connected: false, subscribed: false });
    });

    socket.on("close", () => {
      if (this.ws !== socket) return;
      this.connected = false;
      this.subscribed = false;
      this.ws = null;
      this.emit("status", { connected: false, subscribed: false });
      this.scheduleReconnect();
    });
  }

  connectFromBaseUrl(baseUrl: string, apiPassword = "", guildId = "default"): void {
    try {
      const urlObj = new URL(baseUrl || "http://localhost:8074");
      const protocol = urlObj.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${urlObj.hostname}:${urlObj.port || "8074"}`;
      const pathGuildId = urlObj.pathname.split("/").filter(Boolean)[0] || guildId;
      this.connect(wsUrl, pathGuildId, this.options.endpoints, apiPassword);
    } catch (error) {
      console.error("Failed to derive WebSocket URL from base URL:", error);
      this.connect(undefined, guildId, this.options.endpoints, apiPassword);
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    console.warn(`WS disconnected - reconnecting in ${this.reconnectDelay} ms...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(this.options.url, this.options.guildId, this.options.endpoints, this.options.apiPassword);
    }, this.reconnectDelay);
  }
}

export const wsClient = new WebSocketClient();
