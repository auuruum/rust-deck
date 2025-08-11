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
  maxTitleLength?: string; // New setting for title length control
  useMultiLine?: boolean; // New setting for multi-line support
  [key: string]: string | number | boolean | null | undefined;
}

const DEFAULT_SERVER_ENDPOINT = "";
const DEFAULT_UPDATE_INTERVAL = "5"; // 5 seconds as requested
const DEFAULT_MAX_TITLE_LENGTH = "12";
const DEFAULT_USE_MULTILINE = false;

@action({ UUID: "com.aurum.rust-deck.join-server" })
export class JoinServer extends SingletonAction {
  private settings: JoinServerSettings = {
    serverEndpoint: DEFAULT_SERVER_ENDPOINT,
    updateInterval: DEFAULT_UPDATE_INTERVAL,
    maxTitleLength: DEFAULT_MAX_TITLE_LENGTH,
    useMultiLine: DEFAULT_USE_MULTILINE,
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

  // Helper method to clean server title by removing common prefixes/suffixes
  private cleanServerTitle(title: string): string {
    return title
      .replace(/^\[.*?\]\s*/, '') // Remove [brackets] at start
      .replace(/^\{.*?\}\s*/, '') // Remove {braces} at start
      .replace(/\s*-\s*Official$/i, '') // Remove "- Official" suffix
      .replace(/\s*Official$/i, '') // Remove "Official" suffix
      .replace(/\s*Server$/i, '') // Remove "Server" suffix
      .replace(/\s*\|\s*.*$/, '') // Remove everything after |
      .replace(/\s*#\d+$/, '') // Remove #1, #2 etc at end
      .trim();
  }

  // Helper method to abbreviate common words
  private abbreviateTitle(title: string): string {
    const abbreviations: { [key: string]: string } = {
      'Community': 'Com',
      'Modded': 'Mod',
      'Vanilla': 'Van',
      'Hardcore': 'HC',
      'Battlefield': 'BF',
      'Roleplay': 'RP',
      'Creative': 'Crea',
      'Building': 'Build',
      'Survival': 'Surv',
      'Practice': 'Prac',
      'Training': 'Train',
      'European': 'EU',
      'American': 'US',
      'Australian': 'AU',
      'Canadian': 'CA'
    };
    
    let result = title;
    Object.entries(abbreviations).forEach(([full, abbrev]) => {
      result = result.replace(new RegExp(`\\b${full}\\b`, 'gi'), abbrev);
    });
    
    return result;
  }

  // Helper method to truncate title at word boundaries
  private truncateTitle(title: string, maxLength: number): string {
    if (title.length <= maxLength) {
      return title;
    }
    
    // Try to truncate at word boundaries
    const words = title.split(' ');
    let result = '';
    
    for (const word of words) {
      const testLength = result ? result.length + 1 + word.length : word.length;
      if (testLength > maxLength - 3) { // -3 for "..."
        break;
      }
      result += (result ? ' ' : '') + word;
    }
    
    // If we couldn't fit any words, just truncate the first word
    if (!result && words[0]) {
      result = words[0].substring(0, maxLength - 3);
    }
    
    return result + '...';
  }

  // Helper method to format multi-line title
  private formatMultiLineTitle(title: string, maxLineLength: number): string {
    const words = title.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLength = currentLine ? currentLine.length + 1 + word.length : word.length;
      
      if (testLength > maxLineLength && currentLine) {
        lines.push(currentLine.trim());
        currentLine = word;
      } else {
        currentLine += (currentLine ? ' ' : '') + word;
      }
      
      // Limit to 2 lines max for Stream Deck
      if (lines.length >= 1 && currentLine) {
        // Truncate the second line if needed
        if (currentLine.length > maxLineLength) {
          currentLine = this.truncateTitle(currentLine, maxLineLength);
        }
        lines.push(currentLine);
        break;
      }
    }
    
    // Add remaining text if we haven't reached 2 lines yet
    if (currentLine && lines.length < 2) {
      if (currentLine.length > maxLineLength) {
        currentLine = this.truncateTitle(currentLine, maxLineLength);
      }
      lines.push(currentLine);
    }
    
    return lines.join('\n');
  }

  // Main method to process server title for display
  private processServerTitle(title: string): string {
    const maxLength = parseInt(this.settings.maxTitleLength || DEFAULT_MAX_TITLE_LENGTH);
    const useMultiLine = this.settings.useMultiLine === true;
    
    console.log(`Processing title: "${title}" (max: ${maxLength}, multiline: ${useMultiLine})`);
    
    // Step 1: Clean the title
    let processedTitle = this.cleanServerTitle(title);
    console.log(`After cleaning: "${processedTitle}"`);
    
    // Step 2: Abbreviate common words
    processedTitle = this.abbreviateTitle(processedTitle);
    console.log(`After abbreviation: "${processedTitle}"`);
    
    // Step 3: Apply multi-line or single-line truncation
    if (useMultiLine) {
      const lineLength = Math.max(6, Math.floor(maxLength * 0.7)); // Shorter lines for multi-line
      processedTitle = this.formatMultiLineTitle(processedTitle, lineLength);
    } else {
      processedTitle = this.truncateTitle(processedTitle, maxLength);
    }
    
    console.log(`Final processed title: "${processedTitle}"`);
    return processedTitle;
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
      maxTitleLength: currentSettings.maxTitleLength || DEFAULT_MAX_TITLE_LENGTH,
      useMultiLine: currentSettings.useMultiLine !== undefined ? currentSettings.useMultiLine : DEFAULT_USE_MULTILINE,
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

        // Process the server title to fit the button
        const processedTitle = this.processServerTitle(data.server.title);

        if (this.currentAction) {
          try {
            await (this.currentAction as any).setTitle(processedTitle);
            console.log(`Successfully set title: "${processedTitle}"`);
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