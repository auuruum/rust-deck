import {
  action,
  KeyDownEvent,
  SingletonAction,
  WillAppearEvent,
  WillDisappearEvent,
  streamDeck,
  Target
} from "@elgato/streamdeck";
import type { JsonObject } from "@elgato/streamdeck";

// TypeScript interfaces for the API response
interface SwitchData {
  id: string;
  name: string;
  active: boolean;
  reachable: boolean;
  location: string;
  coordinates: {
    x: number;
    y: number;
  };
  command: string;
  autoDayNightOnOff: number;
  server: string;
  proximity: number;
  messageId: string;
}

interface SwitchesResponse {
  total: number;
  connected: boolean;
  switches: SwitchData[];
}

interface GlobalSettings {
  baseUrl?: string;
}

@action({ UUID: "com.aurum.rust-deck.profile-action" })
export class ProfileAction extends SingletonAction<JsonObject> {
  private switchesData: SwitchData[] = [];
  private interval: NodeJS.Timeout | null = null;
  private knownActions: Map<string, { action: any; coords: any; device: any }> = new Map();

  /**
   * Checks if the button is in the bottom-right position for any Stream Deck size
   */
  private isBottomRightButton(coords: any, device: any): boolean {
    if (!coords || !device) return false;
    
    // Get device dimensions
    const { columns, rows } = device.size;
    
    // Check if this is the bottom-right button (last column, last row)
    // Note: coordinates are 0-indexed
    return coords.column === columns - 1 && coords.row === rows - 1;
  }

  /**
   * Fetches switches data from the API
   */
  private async fetchSwitchesData(): Promise<SwitchData[]> {
    try {
      // Get global settings to retrieve the base URL
      const globalSettings: GlobalSettings = await streamDeck.settings.getGlobalSettings();
      const baseUrl = globalSettings.baseUrl;

      if (!baseUrl) {
        console.error("Base URL not configured in global settings");
        return [];
      }

      // Construct the API endpoint
      const apiUrl = `${baseUrl.replace(/\/$/, '')}/switches`;
      
      console.log(`Fetching switches from: ${apiUrl}`);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as SwitchesResponse;
      console.log(`Fetched ${data.switches.length} switches`);
      
      return data.switches;
    } catch (error) {
      console.error("Error fetching switches data:", error);
      return [];
    }
  }

  /**
   * Gets the button index from coordinates (0-based, row-major order)
   */
  private getButtonIndex(coords: any, device: any): number {
    if (!coords || !device) return -1;
    return coords.row * device.size.columns + coords.column;
  }

  /**
   * Updates button title and image based on switches data
   */
  private async updateButton(action: any, coords: any, device: any): Promise<void> {
    if (this.isBottomRightButton(coords, device)) {
      await action.setTitle("Back");
      return;
    }

    const buttonIndex = this.getButtonIndex(coords, device);
    
    if (buttonIndex >= 0 && buttonIndex < this.switchesData.length) {
      const switchData = this.switchesData[buttonIndex];
      
      // Create multi-line title: Name\nLocation\nStatus
      const statusText = switchData.active ? "On" : "Off";
      const title = `${switchData.name}\n${switchData.location}\n${statusText}`;
      
      // Set title (Stream Deck handles alignment automatically for multi-line titles)
      await action.setTitle(title);
      
      // Set icon based on active state
      const iconPath = switchData.active 
        ? "imgs/icons/smart_switch_on.png"
        : "imgs/icons/smart_switch_off.png";
      
      await action.setImage(iconPath);
      
      console.log(`Set button ${buttonIndex} title to: ${title} with icon: ${iconPath}`);
    } else {
      // If no switch data for this button, leave it empty or set a default
      await action.setTitle("");
      await action.setImage("");
    }
  }

  /**
   * Updates all known buttons without fetching new data
   */
  private async updateAllButtons(): Promise<void> {
    for (const info of this.knownActions.values()) {
      await this.updateButton(info.action, info.coords, info.device);
    }
  }

  /**
   * Fetches new data and updates all buttons
   */
  private async refreshAll(): Promise<void> {
    this.switchesData = await this.fetchSwitchesData();
    await this.updateAllButtons();
  }

  override async onWillAppear(ev: WillAppearEvent<JsonObject>): Promise<void> {
    const coords = (ev.payload as any).coordinates;
    this.knownActions.set(ev.action.id, { action: ev.action, coords, device: ev.action.device });

    if (this.switchesData.length === 0) {
      this.switchesData = await this.fetchSwitchesData();
    }

    await this.updateButton(ev.action, coords, ev.action.device);

    if (!this.interval) {
      this.interval = setInterval(async () => await this.refreshAll(), 2000);
    }
  }

  override async onWillDisappear(ev: WillDisappearEvent<JsonObject>): Promise<void> {
    this.knownActions.delete(ev.action.id);

    if (this.knownActions.size === 0 && this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      this.switchesData = [];
    }
  }

  override async onKeyDown(ev: KeyDownEvent<JsonObject>): Promise<void> {
    const coords = (ev.payload as any).coordinates;
    const device = ev.action.device;
    const deviceId = device.id;

    // Handle back button
    if (this.isBottomRightButton(coords, device)) {
      // Passing undefined as the profile name will switch back to the previous profile
      await streamDeck.profiles.switchToProfile(deviceId, undefined);
      return;
    }

    // Handle switch buttons
    const buttonIndex = this.getButtonIndex(coords, device);
    
    if (buttonIndex >= 0 && buttonIndex < this.switchesData.length) {
      const switchData = this.switchesData[buttonIndex];
      
      // Here you can add logic to toggle the switch or perform other actions
      console.log(`Pressed switch: ${switchData.name} (ID: ${switchData.id}, Command: ${switchData.command})`);
      
      // Example: You could make an API call to toggle the switch
      await this.toggleSwitch(switchData.id);
    }
  }

  /**
   * Example method to toggle a switch (you can implement this based on your API)
   */
  private async toggleSwitch(switchId: string): Promise<void> {
    try {
      const globalSettings: GlobalSettings = await streamDeck.settings.getGlobalSettings();
      const baseUrl = globalSettings.baseUrl;

      if (!baseUrl) {
        console.error("Base URL not configured");
        return;
      }

      // Example API call to toggle switch (adjust based on your actual API)
      const apiUrl = `${baseUrl.replace(/\/$/, '')}/switches/${switchId}/toggle`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to toggle switch ${switchId}`);
      }

      console.log(`Successfully toggled switch ${switchId}`);
      
      // Refresh switches data to get updated state
      this.switchesData = await this.fetchSwitchesData();
      await this.updateAllButtons();
      
    } catch (error) {
      console.error(`Error toggling switch ${switchId}:`, error);
    }
  }
}