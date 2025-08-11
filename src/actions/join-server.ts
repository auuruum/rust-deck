import {
  action,
  KeyDownEvent,
  SingletonAction,
  WillAppearEvent,
  streamDeck,
  JsonObject,
  WillDisappearEvent,
  DidReceiveSettingsEvent,
  Action,
} from "@elgato/streamdeck";
import { GlobalSettings } from "../settings";
import { exec } from "child_process";

export interface ServerResponse {
  activeServer: string;
  server: {
    title: string;
    serverIp: string;
    appPort: string;
    steamId: string;
    playerToken: string;
    description: string;
    img: string;
    url: string;
    notes: any;
    switches: any;
    alarms: any;
    storageMonitors: any;
    markers: any;
    switchGroups: any;
    messageId: string;
    battlemetricsId: string;
    connect: string;
    cargoShipEgressTimeMs: number;
    oilRigLockedCrateUnlockTimeMs: number;
    customCameraGroups: any;
  };
}

interface JoinServerSettings extends JsonObject {
  serverEndpoint?: string;
  updateInterval?: string;
  [key: string]: string | number | boolean | null | undefined;
}

const DEFAULT_SERVER_ENDPOINT = "";
const DEFAULT_UPDATE_INTERVAL = "5"; // 5 seconds as requested

@action({ UUID: "com.aurum.rust-deck.join-server" })
export class JoinServer extends SingletonAction {
  private settings: JoinServerSettings = {
    serverEndpoint: DEFAULT_SERVER_ENDPOINT,
    updateInterval: DEFAULT_UPDATE_INTERVAL,
  };

  private updateInterval: NodeJS.Timeout | null = null;
  private currentAction: Action | null = null;
  private globalSettings: GlobalSettings = { baseUrl: "http://localhost:8080" };
  private lastSettings: JoinServerSettings | null = null;
  private serverData: ServerResponse | null = null;

  constructor() {
    super();
    // Load initial global settings
    this.loadGlobalSettings().then(() => {
      console.log(
        "Global settings loaded in constructor:",
        this.globalSettings
      );
    });

    // Listen for global settings changes
    streamDeck.settings.onDidReceiveGlobalSettings(({ settings }) => {
      this.globalSettings = settings as GlobalSettings;
      console.log("Global settings updated:", this.globalSettings);
      // Refresh display when global settings change
      this.updateServerInfo();
    });
  }

  private async loadGlobalSettings(): Promise<void> {
    try {
      const settings =
        await streamDeck.settings.getGlobalSettings<GlobalSettings>();
      if (settings) {
        this.globalSettings = settings;
        console.log("Loaded global settings:", this.globalSettings);
      }
    } catch (error) {
      console.error("Failed to load global settings:", error);
    }
  }

  private async waitForGlobalSettings(): Promise<void> {
    let attempts = 0;
    while (!this.globalSettings?.baseUrl && attempts < 5) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }
  }

  override async onWillAppear(ev: WillAppearEvent<JoinServerSettings>) {
    this.currentAction = ev.action;
    const currentSettings = ev.payload.settings || {};

    console.log("onWillAppear - Current settings:", currentSettings);
    console.log("onWillAppear - Current global settings:", this.globalSettings);

    // Always update settings to ensure defaults
    const newSettings = {
      ...currentSettings,
      serverEndpoint: currentSettings.serverEndpoint || DEFAULT_SERVER_ENDPOINT,
      updateInterval: currentSettings.updateInterval || DEFAULT_UPDATE_INTERVAL,
    };

    console.log("onWillAppear - New settings:", newSettings);

    // Save settings
    if (this.currentAction) {
      try {
        await (this.currentAction as any).setSettings(newSettings);
        console.log("Successfully saved settings");
      } catch (error) {
        console.error("Failed to set settings:", error);
      }
    }

    this.settings = newSettings;
    this.lastSettings = newSettings;

    // Wait for global settings to be available
    console.log("Waiting for global settings...");
    await this.waitForGlobalSettings();
    console.log("Global settings after wait:", this.globalSettings);

    console.log("Join Server button appeared with settings:", this.settings);

    // Start periodic updates
    this.startUpdateInterval();
  }

  override onWillDisappear(ev: WillDisappearEvent) {
    console.log("Join Server button disappeared, stopping updates...");
    // Clean up interval when button disappears
    this.stopUpdateInterval();
  }

  override async onKeyDown(ev: KeyDownEvent<JsonObject>) {
    console.log("Join Server button pressed, attempting to connect...");
    console.log("Current server data:", this.serverData);

    if (this.serverData?.server?.connect) {
      // Clean the "connect" prefix and trim spaces
      const serverAddress = this.serverData.server.connect
        .replace("connect ", "")
        .trim();

      // Always use the working Rust launch format
      const launchUrl = `steam://run/252490//+connect ${serverAddress}`;
      console.log(`Attempting to launch Rust on Windows with: ${launchUrl}`);

      // Use Windows Shell to trigger Steam protocol handler
      exec(`start "" "${launchUrl}"`, (error) => {
        if (error) {
          console.error("Failed to launch Rust via Steam protocol:", error);
        } else {
          console.log("Rust launch command sent successfully.");
        }
      });
    } else {
      console.error("No server data available or connect field missing");
      if (this.serverData?.server) {
        console.log(
          "connect field:",
          this.serverData.server.connect || "missing"
        );
      }
    }

    // Optional: Refresh data on button press
    this.updateServerInfo();
  }

  override onDidReceiveSettings(
    ev: DidReceiveSettingsEvent<JoinServerSettings>
  ) {
    console.log("Settings received:", ev.payload.settings);
    this.settings = ev.payload.settings;
    this.lastSettings = ev.payload.settings;
    // Restart the update interval with new settings
    this.startUpdateInterval();
  }

  private startUpdateInterval() {
    // Clear any existing interval
    this.stopUpdateInterval();

    // Get interval in milliseconds
    const interval =
      parseInt(this.settings.updateInterval || DEFAULT_UPDATE_INTERVAL) * 1000;
    if (isNaN(interval) || interval <= 0) {
      console.error("Invalid update interval:", this.settings.updateInterval);
      return;
    }

    console.log(`Starting update interval for join server: ${interval}ms`);

    // Fetch immediately
    this.updateServerInfo();

    // Set up the new interval
    this.updateInterval = setInterval(() => {
      this.updateServerInfo();
    }, interval);
  }

  private stopUpdateInterval() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private async updateServerInfo() {
    if (!this.currentAction) {
      console.log("No action available to update");
      return;
    }

    try {
      const baseUrl = this.globalSettings?.baseUrl?.trim();
      console.log("Global settings baseUrl:", baseUrl);
      console.log("Current settings:", this.settings);

      if (!baseUrl) {
        console.error("Base URL not configured in global settings");
        await (this.currentAction as any).setTitle("No URL");
        return;
      }

      // For this action, the baseUrl from global settings IS the complete URL
      // Don't append the serverEndpoint since it's already included in baseUrl
      const url = baseUrl.replace(/\/+$/, ""); // Just remove trailing slashes
      console.log("Fetching server info from:", url);

      try {
        const response = await fetch(url);
        console.log("Response status:", response.status);

        const text = await response.text();
        console.log("Raw response length:", text.length);
        
        if (!response.ok) {
          // Try to parse error response for specific error messages
          try {
            const errorData = JSON.parse(text);
            if (errorData.error === "Guild not found or no active server") {
              await (this.currentAction as any).setTitle("No server");
              return;
            }
          } catch (parseError) {
            // If we can't parse the error response, fall through to generic error
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        let data: ServerResponse;
        try {
          data = JSON.parse(text) as ServerResponse;
          console.log(
            "Received server data:",
            data.server ? data.server.title : "No title"
          );
        } catch (parseError) {
          console.error("Failed to parse JSON response:", parseError);
          await (this.currentAction as any).setTitle("Parse Error");
          return;
        }

        // Validate the response has the required fields
        if (!data.server) {
          console.error("Response missing server object");
          await (this.currentAction as any).setTitle("No Server");
          return;
        }

        if (!data.server.title) {
          console.error("Server object missing title field");
          await (this.currentAction as any).setTitle("No Title");
          return;
        }

        this.serverData = data;

        console.log("Server info received:", data.server.title);

        // Set the button title to the server title
        const title = data.server.title;

        if (this.currentAction) {
          try {
            await (this.currentAction as any).setTitle(title);
            console.log("Successfully set title:", title);
          } catch (error) {
            console.error("Failed to set title:", error);
            await (this.currentAction as any).setTitle("Set Error");
          }
        }
      } catch (fetchError) {
        console.error("Fetch error:", fetchError);
        await (this.currentAction as any).setTitle("Fetch Error");
      }
    } catch (error) {
      console.error("General error in updateServerInfo:", error);
      if (this.currentAction) {
        try {
          await (this.currentAction as any).setTitle("General Error");
        } catch (setError) {
          console.error("Failed to set error title:", setError);
        }
      }
    }
  }
}
