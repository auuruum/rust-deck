import {
  action,
  KeyDownEvent,
  SingletonAction,
  WillAppearEvent,
  WillDisappearEvent,
  streamDeck,
  Target,
} from "@elgato/streamdeck";
import type { JsonObject } from "@elgato/streamdeck";

// TypeScript interfaces for switches
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
  image: string;
  type: 'switch'; // Add type identifier
}

interface SwitchesResponse {
  total: number;
  connected: boolean;
  switches: SwitchData[];
}

// TypeScript interfaces for alarms
interface AlarmData {
  id: string;
  name: string;
  active: boolean;
  reachable: boolean;
  message: string;
  everyone: boolean;
  lastTrigger: number;
  location: string;
  coordinates: object;
  command: string;
  image: string;
  server: string;
  type: 'alarm'; // Add type identifier
}

interface AlarmsResponse {
  total: number;
  connected: boolean;
  alarms: AlarmData[];
}

interface GlobalSettings {
  baseUrl?: string;
  profileType?: "smart_switches" | "smart_alarms" | "smart_devices";
}

type DeviceData = SwitchData | AlarmData;

@action({ UUID: "com.aurum.rust-deck.profile-action" })
export class ProfileAction extends SingletonAction<JsonObject> {
  private devicesData: DeviceData[] = [];
  private interval: NodeJS.Timeout | null = null;
  private knownActions: Map<string, { action: any; coords: any; device: any }> =
    new Map();

  /**
   * Converts Unix timestamp to compact human-readable relative time
   */
  private getTimeAgo(unixTimestamp: number): string {
    if (!unixTimestamp || unixTimestamp === 0) {
      return "Never";
    }

    const now = Math.floor(Date.now() / 1000); // Current time in Unix timestamp
    const diffSeconds = now - unixTimestamp;

    // If timestamp is in the future, show "now"
    if (diffSeconds < 0) {
      return "now";
    }

    const intervals = [
      { label: 'y', seconds: 31536000 },
      { label: 'mo', seconds: 2592000 },
      { label: 'w', seconds: 604800 },
      { label: 'd', seconds: 86400 },
      { label: 'h', seconds: 3600 },
      { label: 'm', seconds: 60 },
      { label: 's', seconds: 1 }
    ];

    for (const interval of intervals) {
      const count = Math.floor(diffSeconds / interval.seconds);
      if (count >= 1) {
        return `(${count}${interval.label} ago)`;
      }
    }

    return "now";
  }

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
      const globalSettings: GlobalSettings =
        await streamDeck.settings.getGlobalSettings();
      const baseUrl = globalSettings.baseUrl;

      if (!baseUrl) {
        console.error("Base URL not configured in global settings");
        return [];
      }

      // Construct the API endpoint
      const apiUrl = `${baseUrl.replace(/\/$/, "")}/switches`;

      console.log(`Fetching switches from: ${apiUrl}`);

      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as SwitchesResponse;
      console.log(`Fetched ${data.switches.length} switches`);

      // Filter switches to include only reachable ones and add type identifier
      const reachableSwitches = data.switches
        .filter((switchData) => switchData.reachable)
        .map((switchData) => ({ ...switchData, type: 'switch' as const }));
      return reachableSwitches;
    } catch (error) {
      console.error("Error fetching switches data:", error);
      return [];
    }
  }

  /**
   * Fetches alarms data from the API
   */
  private async fetchAlarmsData(): Promise<AlarmData[]> {
    try {
      // Get global settings to retrieve the base URL
      const globalSettings: GlobalSettings =
        await streamDeck.settings.getGlobalSettings();
      const baseUrl = globalSettings.baseUrl;

      if (!baseUrl) {
        console.error("Base URL not configured in global settings");
        return [];
      }

      // Construct the API endpoint
      const apiUrl = `${baseUrl.replace(/\/$/, "")}/alarms`;

      console.log(`Fetching alarms from: ${apiUrl}`);

      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as AlarmsResponse;
      console.log(`Fetched ${data.alarms.length} alarms`);

      // Filter alarms to include only reachable ones and add type identifier
      const reachableAlarms = data.alarms
        .filter((alarmData) => alarmData.reachable)
        .map((alarmData) => ({ ...alarmData, type: 'alarm' as const }));
      return reachableAlarms;
    } catch (error) {
      console.error("Error fetching alarms data:", error);
      return [];
    }
  }

  /**
   * Fetches data based on the current profile type
   */
  private async fetchDevicesData(): Promise<DeviceData[]> {
    const globalSettings: GlobalSettings =
      await streamDeck.settings.getGlobalSettings();
    const profileType = globalSettings.profileType || "smart_switches";

    if (profileType === "smart_alarms") {
      return await this.fetchAlarmsData();
    } else if (profileType === "smart_devices") {
      // Fetch both switches and alarms, then combine them
      const [switches, alarms] = await Promise.all([
        this.fetchSwitchesData(),
        this.fetchAlarmsData()
      ]);
      
      // Combine and sort by name for consistent ordering
      const combinedDevices = [...switches, ...alarms];
      combinedDevices.sort((a, b) => {
        // First sort by type (switches first, then alarms)
        if (a.type !== b.type) {
          return a.type === 'switch' ? -1 : 1;
        }
        // Then sort by name within each type
        return a.name.localeCompare(b.name);
      });
      
      console.log(`Combined devices: ${switches.length} switches + ${alarms.length} alarms = ${combinedDevices.length} total`);
      return combinedDevices;
    } else {
      return await this.fetchSwitchesData();
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
   * Updates button title and image based on devices data
   */
  private currentPage: number = 0;
  private devicesPerPage: number = 15;

  private async updateButton(
    action: any,
    coords: any,
    device: any
  ): Promise<void> {
    const buttonIndex = this.getButtonIndex(coords, device);
    const totalDevices = this.devicesData.length;
    const totalPages = Math.ceil(totalDevices / (this.devicesPerPage - 2));

    // Get profile type to determine what we're showing
    const globalSettings: GlobalSettings =
      await streamDeck.settings.getGlobalSettings();
    const profileType = globalSettings.profileType || "smart_switches";

    // Back button always first button on first page
    if (buttonIndex === 0 && this.currentPage === 0) {
      await action.setTitle("Back");
      await action.setImage("");
      return;
    }

    // Page navigation button always last button, hide if only one page or not enough devices to fill all slots
    if (buttonIndex === this.devicesPerPage - 1) {
      if (totalPages <= 1 || totalDevices <= this.devicesPerPage - 2) {
        await action.setTitle("");
        await action.setImage("");
        return;
      }
      const pageTitle = `Page ${this.currentPage + 1}/${totalPages}`;
      await action.setTitle(pageTitle);
      await action.setImage("");
      return;
    }

    // Calculate device index excluding first (back) and last (page) buttons
    let deviceIndex =
      this.currentPage * (this.devicesPerPage - 2) +
      buttonIndex - (this.currentPage === 0 ? 1 : 0);

    if (deviceIndex >= 0 && deviceIndex < totalDevices) {
      const deviceData = this.devicesData[deviceIndex];
      
      // Handle device display based on type
      if (deviceData.type === 'alarm') {
        const alarmData = deviceData as AlarmData;
        const statusText = alarmData.active ? "On" : "Off";
        const timeAgo = this.getTimeAgo(alarmData.lastTrigger);
        const deviceTypeLabel = profileType === "smart_devices" ? "[A]" : "";
        const title = `${deviceTypeLabel}\n${alarmData.name}\n${alarmData.location}\n${statusText}\n${timeAgo}`;
        await action.setTitle(title);
        const iconPath = alarmData.active
          ? "imgs/icons/electrics_enabled/" + alarmData.image
          : "imgs/icons/electrics/" + alarmData.image;
        await action.setImage(iconPath);
        console.log(
          `Set alarm button ${buttonIndex} title to: ${title} with icon: ${iconPath}`
        );
      } else {
        // Handle switch display
        const switchData = deviceData as SwitchData;
        const statusText = switchData.active ? "On" : "Off";
        const deviceTypeLabel = profileType === "smart_devices" ? "[S]" : "";
        const title = `${deviceTypeLabel}\n${switchData.name}\n${switchData.location}\n${statusText}`;
        await action.setTitle(title);
        const iconPath = switchData.active
          ? "imgs/icons/electrics_enabled/" + switchData.image
          : "imgs/icons/electrics/" + switchData.image;
        await action.setImage(iconPath);
        console.log(
          `Set switch button ${buttonIndex} title to: ${title} with icon: ${iconPath}`
        );
      }
    } else {
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
  // Prevent refresh if a toggle is in progress to avoid flicker
  private isToggling: boolean = false;

  private async refreshAll(): Promise<void> {
    if (this.isToggling) {
      return;
    }
    // Ensure devicesData is replaced, not appended, to avoid duplicates
    this.devicesData = await this.fetchDevicesData();
    const totalPages = Math.ceil(this.devicesData.length / (this.devicesPerPage - 2));
    if (this.currentPage >= totalPages) {
      this.currentPage = Math.max(0, totalPages - 1);
    }
    await this.updateAllButtons();
  }

  override async onWillAppear(ev: WillAppearEvent<JsonObject>): Promise<void> {
    const coords = (ev.payload as any).coordinates;
    this.knownActions.set(ev.action.id, {
      action: ev.action,
      coords,
      device: ev.action.device,
    });

    if (this.devicesData.length === 0) {
      this.devicesData = await this.fetchDevicesData();
    }

    await this.updateButton(ev.action, coords, ev.action.device);

    if (!this.interval) {
      this.interval = setInterval(async () => await this.refreshAll(), 500);
    }
  }

  override async onWillDisappear(
    ev: WillDisappearEvent<JsonObject>
  ): Promise<void> {
    this.knownActions.delete(ev.action.id);

    if (this.knownActions.size === 0 && this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      this.devicesData = [];
    }
  }

  override async onKeyDown(ev: KeyDownEvent<JsonObject>): Promise<void> {
    const coords = (ev.payload as any).coordinates;
    const device = ev.action.device;
    const deviceId = device.id;

    const buttonIndex = this.getButtonIndex(coords, device);

    // Back button always first button on first page
    if (buttonIndex === 0 && this.currentPage === 0) {
      await streamDeck.profiles.switchToProfile(deviceId, undefined);
      return;
    }

    // Page navigation button always last button
    if (buttonIndex === this.devicesPerPage - 1) {
      const totalDevices = this.devicesData.length;
      const totalPages = Math.ceil(totalDevices / (this.devicesPerPage - 2));
      this.currentPage = (this.currentPage + 1) % totalPages;
      await this.updateAllButtons();
      return;
    }

    // Handle device buttons
    let deviceIndex =
      this.currentPage * (this.devicesPerPage - 2) +
      buttonIndex - (this.currentPage === 0 ? 1 : 0);

    if (deviceIndex >= 0 && deviceIndex < this.devicesData.length) {
      const deviceData = this.devicesData[deviceIndex];
      
      // Handle device interaction based on type
      if (deviceData.type === 'alarm') {
        // Alarms are read-only, so just refresh the data
        console.log(
          `Pressed alarm: ${(deviceData as AlarmData).name} (ID: ${deviceData.id}) - Refreshing`
        );
        await this.refreshAll();
      } else {
        const switchData = deviceData as SwitchData;
        console.log(
          `Pressed switch: ${switchData.name} (ID: ${switchData.id}, Command: ${switchData.command})`
        );
        await this.toggleSwitch(switchData.id);
      }
    }
  }

  /**
   * Toggles a switch
   */
  private async toggleSwitch(switchId: string): Promise<void> {
    this.isToggling = true;
    try {
      const globalSettings: GlobalSettings =
        await streamDeck.settings.getGlobalSettings();
      const baseUrl = globalSettings.baseUrl;

      if (!baseUrl) {
        console.error("Base URL not configured");
        return;
      }

      // Optimistically flip local state for snappier UI
      const localIndex = this.devicesData.findIndex(s => s.id === switchId);
      if (localIndex !== -1 && this.devicesData[localIndex].type === 'switch') {
        (this.devicesData[localIndex] as SwitchData).active = !(this.devicesData[localIndex] as SwitchData).active;
        await this.updateAllButtons();
      }

      // Remote API toggle
      const apiUrl = `${baseUrl.replace(/\/$/, "")}/switches/${switchId}/toggle`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Failed to toggle switch ${switchId}`);
      }

      console.log(`Successfully toggled switch ${switchId}`);

      // Allow backend to process toggle before refreshing to prevent immediate flicker
      await new Promise(resolve => setTimeout(resolve, 300));
      this.devicesData = await this.fetchDevicesData();
      await this.updateAllButtons();
      this.isToggling = false;
    } catch (error) {
      // Revert optimistic update if remote toggle fails
      const revertIndex = this.devicesData.findIndex(s => s.id === switchId);
      if (revertIndex !== -1 && this.devicesData[revertIndex].type === 'switch') {
        (this.devicesData[revertIndex] as SwitchData).active = !(this.devicesData[revertIndex] as SwitchData).active;
        await this.updateAllButtons();
      }
      console.error(`Error toggling switch ${switchId}:`, error);
      this.isToggling = false;
    }
  }
}