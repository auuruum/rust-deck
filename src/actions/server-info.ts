import { 
    action, 
    KeyDownEvent, 
    SingletonAction, 
    WillAppearEvent, 
    streamDeck, 
    JsonObject,
    WillDisappearEvent,
    DidReceiveSettingsEvent,
    Action
} from "@elgato/streamdeck";
import { GlobalSettings } from "../settings";

export interface ServerInfoResponse {
    currentPlayers: number;
    maxPlayers: number;
    queuedPlayers: number;
}

interface ServerInfoSettings extends JsonObject {
    serverPath?: string;
    updateInterval: number | string;
    [key: string]: string | number | boolean | null | undefined;
}

const DEFAULT_SERVER_PATH = "/pop";
const DEFAULT_UPDATE_INTERVAL = 30;

@action({ UUID: "com.aurum.rust-deck.server-info" })
export class ServerInfo extends SingletonAction {
    private settings: ServerInfoSettings = {
        serverPath: DEFAULT_SERVER_PATH,
        updateInterval: DEFAULT_UPDATE_INTERVAL,
        // Add index signature properties
        '': '',
        '0': 0,
        'false': false,
        'null': null
    };
    
    private updateInterval: NodeJS.Timeout | null = null;
    private currentAction: Action | null = null;
    private globalSettings: GlobalSettings = { baseUrl: "http://localhost:8080" };


    constructor() {
        super();
        // Load initial global settings
        this.loadGlobalSettings();
        // Listen for global settings changes
        streamDeck.settings.onDidReceiveGlobalSettings(({ settings }) => {
            this.globalSettings = settings as GlobalSettings;
            console.log('Global settings updated:', this.globalSettings);
        });
    }

    private async loadGlobalSettings() {
        try {
            const settings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
            if (settings) {
                this.globalSettings = settings;
                console.log('Loaded global settings:', this.globalSettings);
            }
        } catch (error) {
            console.error('Failed to load global settings:', error);
        }
    }

    override async onWillAppear(ev: WillAppearEvent<ServerInfoSettings>) {
        this.currentAction = ev.action;
        const currentSettings = ev.payload.settings || {};
        
        // Always update settings to ensure correct path
        const newSettings = {
            ...currentSettings,
            serverPath: DEFAULT_SERVER_PATH,
            updateInterval: currentSettings.updateInterval || DEFAULT_UPDATE_INTERVAL
        };

        // Save settings
        if (this.currentAction) {
            try {
                await (this.currentAction as any).setSettings(newSettings);
            } catch (error) {
                console.error('Failed to set settings:', error);
            }
        }
        
        this.settings = newSettings;
        console.log("Server Info button appeared with settings:", this.settings);
        
        // Start periodic updates when the button appears
        this.updateServerInfo();
        this.startUpdateInterval();
    }

    override onWillDisappear(ev: WillDisappearEvent) {
        console.log("Server Info button disappeared, stopping updates...");
        // Clean up interval when button disappears
        this.stopUpdateInterval();
    }

    override onKeyDown(ev: KeyDownEvent<JsonObject>) {
        console.log("Server Info button pressed, updating immediately...");
        // Refresh data on button press
        this.updateServerInfo(ev.action);
    }

    override onDidReceiveSettings(ev: DidReceiveSettingsEvent<ServerInfoSettings>) {
        console.log("Settings received:", ev.payload.settings);
        this.settings = {
            serverPath: ev.payload.settings.serverPath || DEFAULT_SERVER_PATH,
            updateInterval: typeof ev.payload.settings.updateInterval === 'number' 
                ? ev.payload.settings.updateInterval 
                : parseInt(ev.payload.settings.updateInterval as string) || DEFAULT_UPDATE_INTERVAL
        };
        
        console.log("Updated settings:", this.settings);
        // Restart the update interval with new settings
        this.stopUpdateInterval();
        this.startUpdateInterval();
    }

    private startUpdateInterval() {
        console.log(`Starting update interval: ${this.settings.updateInterval} seconds`);
        const intervalMs = (typeof this.settings.updateInterval === 'number' 
            ? this.settings.updateInterval 
            : parseInt(this.settings.updateInterval) || DEFAULT_UPDATE_INTERVAL) * 1000;
            
        this.updateInterval = setInterval(() => {
            console.log("Interval update triggered...");
            this.updateServerInfo();
        }, intervalMs);
    }

    private stopUpdateInterval() {
        if (this.updateInterval) {
            console.log("Stopping update interval");
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    private getServerUrl(): string {
        // Remove any trailing slashes from the base URL
        const baseUrl = (this.globalSettings?.baseUrl?.trim() || "http://localhost:8080").replace(/\/+$/, '');
        // Ensure server path starts with a single slash
        const serverPath = this.settings.serverPath?.startsWith('/') 
            ? this.settings.serverPath 
            : `/${this.settings.serverPath}`;
        // Combine base URL and server path, ensuring there's exactly one slash between them
        return `${baseUrl}${serverPath}`;
    }

    private async updateServerInfo() {
        if (!this.currentAction) {
            console.log('No action available to update');
            return;
        }

        try {
            const baseUrl = this.globalSettings?.baseUrl?.trim();
            if (!baseUrl) {
                throw new Error('Base URL not configured');
            }
            
            const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
            const path = this.settings.serverPath || DEFAULT_SERVER_PATH;
            const url = `${normalizedBaseUrl}${path}`;
            console.log('Fetching server info from:', url);

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const rawData = await response.json();
            const data = rawData as ServerInfoResponse;
            
            // Validate the response has the required fields
            if (!('currentPlayers' in data) || !('maxPlayers' in data) || !('queuedPlayers' in data)) {
                throw new Error('Invalid response format');
            }

            console.log(`Server info received: ${data.currentPlayers}/${data.maxPlayers} players, queue: ${data.queuedPlayers}`);

            // Set the button title to show player counts
            let title = `${data.currentPlayers}/${data.maxPlayers}`;
            if (data.queuedPlayers > 0) {
                title += `(${data.queuedPlayers})`;
            }
            
            if (this.currentAction) {
                try {
                    await (this.currentAction as any).setTitle(title);
                } catch (error) {
                    console.error('Failed to set title:', error);
                    await (this.currentAction as any).setTitle("Error");
                }
            }
        } catch (error) {
            console.error('Error updating server info:', error);
            if (this.currentAction) {
                try {
                    await (this.currentAction as any).setTitle("Error");
                } catch (setError) {
                    console.error('Failed to set error title:', setError);
                }
            }
        }
    }
}