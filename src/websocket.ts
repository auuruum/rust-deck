import { EventEmitter } from "events";

/**
 * Central WebSocket client for Rust-Deck that auto-reconnects and re-emits
 * server "update" messages to Stream Deck actions.
 */
export interface UpdateMessage {
  type: "update" | "immediate_update";
  guildId?: string;
  data: Record<string, unknown>;
}

class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readonly reconnectDelay = 5000; // 5 s
  private readonly defaultUrl = "ws://localhost:8074";
  private connected = false;
  private subscribed = false;

  /** Connect to the Rust monitoring WebSocket. */
  connect(url?: string, guildId = "default", endpoints: string[] = ["time", "pop", "switches", "alarms", "switchgroups"]): void {
    const targetUrl = url?.trim() || this.defaultUrl;

    if (this.ws) {
      // Already initialised, avoid duplicate connections.
      return;
    }

    try {
      this.ws = new WebSocket(targetUrl);
    } catch (err) {
      console.error("WebSocket initialisation failed:", err);
      this.scheduleReconnect(url, guildId, endpoints);
      return;
    }

    this.ws.onopen = () => {
      this.connected = true;
      this.subscribed = false;
      // Send subscription request once open.
      try {
        const subMsg = {
          type: "subscribe",
          guildId,
          endpoints,
        };
        this.ws?.send(JSON.stringify(subMsg));
        this.subscribed = true;
      } catch (err) {
        console.error("Failed to send subscription message:", err);
      }
    };

    this.ws.onmessage = (ev: MessageEvent) => {
      let payload: UpdateMessage | null = null;
      try {
        payload = JSON.parse(ev.data.toString());
      } catch (err) {
        console.error("Invalid WS JSON:", err);
        return;
      }

      if (!payload || (payload.type !== "update" && payload.type !== "immediate_update")) {
        // Only interested in update messages
        return;
      }

      // Emit per-key events (e.g., "time", "switches")
      for (const key of Object.keys(payload.data || {})) {
        this.emit(key, (payload.data as Record<string, unknown>)[key]);
      }
      // Emit a generic update event with full payload
      this.emit("update", payload.data);
    };

    this.ws.onerror = (err: Event) => {
      console.error("WebSocket error:", err);
    };

    this.ws.onclose = () => {
      this.connected = false;
      this.ws = null;
      this.scheduleReconnect(url, guildId, endpoints);
    };
  }

  /** Close connection and stop reconnection attempts. */
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

  private scheduleReconnect(url?: string, guildId: string = "default", endpoints: string[] = ["time", "pop", "switches", "alarms", "switchgroups"]): void {
    if (this.reconnectTimer) return;
    console.warn(`WS disconnected – reconnecting in ${this.reconnectDelay} ms…`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(url, guildId, endpoints);
    }, this.reconnectDelay);
  }
}

// Export a singleton instance
export const wsClient = new WebSocketClient();