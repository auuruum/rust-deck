import { action, KeyDownEvent, SingletonAction, WillAppearEvent, DidReceiveSettingsEvent, Target, streamDeck, WillDisappearEvent } from "@elgato/streamdeck";
import { GlobalSettings } from "../settings";
import { wsClient } from "../websocket";

interface TimeSettings {
    baseUrl?: string;
    lastUpdate?: string;
    displayFormat?: string;
    customTitle?: string;
    titlePosition?: string;
    [key: string]: string | undefined;
}

interface TimeResponse {
    currentTime: number;
    currentTimeFormatted: string;
    isDay: boolean;
    timeTillChange: string | null;
    sunrise: number;
    sunriseFormatted: string;
    sunset: number;
    sunsetFormatted: string;
    dayLengthMinutes: number;
    timeScale: number;
}

const DEFAULT_BASE_URL = "http://localhost:8074";
const DEFAULT_DISPLAY_FORMAT = "time";
const DEFAULT_TITLE_POSITION = "top";

@action({ UUID: "com.aurum.rust-deck.time" })
export class TimeDisplay extends SingletonAction<TimeSettings> {
    private globalSettings: GlobalSettings = { baseUrl: DEFAULT_BASE_URL };
    private currentAction: any = null;
    private lastSettings: TimeSettings = {};
    private realtimeTimer: NodeJS.Timeout | null = null;
    private lastTimeData: TimeResponse | null = null;

    constructor() {
        super();
        wsClient.on("time", (data: TimeResponse) => {
            if (!data || typeof data.currentTimeFormatted !== "string") return;
            this.lastTimeData = data;
            if (this.currentAction) {
                this.applyTimeData(this.currentAction, data, this.lastSettings);
            }
        });

        // Load global settings when the plugin starts
        this.loadGlobalSettings().then(() => {
            console.log('Global settings loaded in constructor:', this.globalSettings);
        });
        
        // Listen for global settings changes
        streamDeck.settings.onDidReceiveGlobalSettings(({ settings }) => {
            this.globalSettings = settings as GlobalSettings;
            console.log('Global settings updated:', this.globalSettings);
            // Refresh display when global settings change
            if (this.currentAction) {
                this.refreshTime(this.currentAction, this.lastSettings);
            }
        });
    }

    private async loadGlobalSettings(): Promise<void> {
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

    private async waitForGlobalSettings(): Promise<void> {
        let attempts = 0;
        while (!this.globalSettings?.baseUrl && attempts < 5) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
    }

    private startRealtime(action: any, settings: TimeSettings) {
        this.currentAction = action;
        this.lastSettings = settings;
        this.refreshTime(action, settings);
        if (this.realtimeTimer) {
            clearInterval(this.realtimeTimer);
        }
        this.realtimeTimer = setInterval(() => {
            if (this.currentAction) {
                this.applyLatestWsData(this.currentAction, this.lastSettings);
            }
        }, 1000);
    }

    private stopRealtime() {
        this.currentAction = null;
        if (this.realtimeTimer) {
            clearInterval(this.realtimeTimer);
            this.realtimeTimer = null;
        }
    }

    override async onWillAppear(ev: WillAppearEvent<TimeSettings>): Promise<void> {
        const currentSettings = ev.payload.settings;
        let settingsChanged = false;
        const newSettings = { ...currentSettings };

        if (!currentSettings.displayFormat) {
            newSettings.displayFormat = DEFAULT_DISPLAY_FORMAT;
            settingsChanged = true;
        }
        if (!currentSettings.titlePosition) {
            newSettings.titlePosition = DEFAULT_TITLE_POSITION;
            settingsChanged = true;
        }
        if (settingsChanged) {
            await ev.action.setSettings(newSettings);
        }

        // Wait for global settings to be available
        await this.waitForGlobalSettings();
        
        console.log("Time display will appear with settings:", newSettings);
        this.startRealtime(ev.action, newSettings);
    }

    override async onWillDisappear(ev: WillDisappearEvent<TimeSettings>): Promise<void> {
        console.log("Time display will disappear");
        this.stopRealtime();
    }

    override async onKeyDown(ev: KeyDownEvent<TimeSettings>): Promise<void> {
        console.log("Time display key down with settings:", ev.payload.settings);
        await this.refreshTime(ev.action, ev.payload.settings);
    }

    override onDidReceiveSettings(ev: DidReceiveSettingsEvent<TimeSettings>): void {
        console.log("Time display did receive settings:", ev.payload.settings);
        this.startRealtime(ev.action, ev.payload.settings);
    }

    private async refreshTime(action: any, settings: TimeSettings): Promise<void> {
        if (await this.applyLatestWsData(action, settings)) return;
        await this.fetchTime(action, settings);
    }

    private async applyLatestWsData(action: any, settings: TimeSettings): Promise<boolean> {
        const latest = wsClient.getLatestData().time as TimeResponse | undefined;
        const data = latest || this.lastTimeData;
        if (!data || typeof data.currentTimeFormatted !== "string") {
            return false;
        }

        this.lastTimeData = data;
        await this.applyTimeData(action, data, settings);
        return true;
    }

    private async applyTimeData(action: any, data: TimeResponse, settings: TimeSettings): Promise<void> {
        const displayFormat = settings.displayFormat || DEFAULT_DISPLAY_FORMAT;
        const titlePosition = settings.titlePosition || DEFAULT_TITLE_POSITION;
        let displayText = "";

        switch (displayFormat) {
            case "time":
                displayText = data.currentTimeFormatted;
                break;
            case "sunrise":
                displayText = data.sunriseFormatted;
                break;
            case "sunset":
                displayText = data.sunsetFormatted;
                break;
            case "day_length":
                displayText = `${data.dayLengthMinutes.toFixed(1)}m`;
                break;
            default:
                displayText = data.currentTimeFormatted;
        }

        const finalDisplayText = settings.customTitle
            ? titlePosition === "top"
                ? `${settings.customTitle}\n${displayText}`
                : `${displayText}\n${settings.customTitle}`
            : displayText;

        await action.setTitle(finalDisplayText, Target.HardwareAndSoftware, titlePosition === "bottom" ? 1 : 0);
        if (settings.lastUpdate !== displayText) {
            await action.setSettings({ ...settings, lastUpdate: displayText });
        }
    }

    private async fetchTime(action: any, settings: TimeSettings): Promise<void> {
        try {
            // Use global baseUrl if available, otherwise fall back to instance settings or default
            const baseUrl = this.globalSettings?.baseUrl?.trim() || 
                           (settings.baseUrl && settings.baseUrl.trim() ? settings.baseUrl.trim() : DEFAULT_BASE_URL);
            
            console.log('Using base URL:', baseUrl);
            if (!baseUrl) {
                console.error("Base URL not configured");
                await action.setTitle("No URL");
                return;
            }

            // Ensure there's exactly one slash between baseUrl and the endpoint
            const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
            const url = `${normalizedBaseUrl}/time`;
            console.log("Fetching time from:", url);
            
            // Get API password from global settings
            const apiPassword = this.globalSettings?.apiPassword;
            const headers: HeadersInit = {};
            if (apiPassword) {
                headers["X-API-Key"] = apiPassword;
            }
            
            try {
                const response = await fetch(url, { headers });
                console.log("Response status:", response.status);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const text = await response.text();
                console.log("Raw response:", text);
                
                try {
                    const data = JSON.parse(text) as TimeResponse;
                    console.log("Parsed time data:", data);
                    
                    await this.applyTimeData(action, data, settings);
                } catch (parseError) {
                    console.error("Failed to parse JSON response:", parseError);
                    console.error("Raw response was:", text);
                    await action.setTitle("Parse Error");
                }
            } catch (fetchError) {
                console.error("Fetch error:", fetchError);
                await action.setTitle("Error");
            }
        } catch (error) {
            console.error("Error in fetchTime:", error);
            await action.setTitle("Error");
        }
    }
}
