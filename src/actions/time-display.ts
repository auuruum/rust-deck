import { action, KeyDownEvent, SingletonAction, WillAppearEvent, DidReceiveSettingsEvent, Target, streamDeck, WillDisappearEvent } from "@elgato/streamdeck";
import { GlobalSettings } from "../settings";

interface TimeSettings {
    baseUrl?: string;
    lastUpdate?: string;
    displayFormat?: string;
    customTitle?: string;
    titlePosition?: string;
    updateInterval?: string;
    [key: string]: string | undefined;
}

interface TimeResponse {
    currentTime: number;
    currentTimeFormatted: string;
    isDay: boolean;
    timeTillChange: string;
    sunrise: number;
    sunriseFormatted: string;
    sunset: number;
    sunsetFormatted: string;
    dayLengthMinutes: number;
    timeScale: number;
}

const DEFAULT_BASE_URL = "http://localhost:8080";
const DEFAULT_DISPLAY_FORMAT = "time";
const DEFAULT_TITLE_POSITION = "top";

@action({ UUID: "com.aurum.rust-deck.time" })
export class TimeDisplay extends SingletonAction<TimeSettings> {
    private globalSettings: GlobalSettings = { baseUrl: DEFAULT_BASE_URL };
    private updateInterval: NodeJS.Timeout | null = null;
    private currentAction: any = null;

    constructor() {
        super();
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
                this.fetchTime(this.currentAction, this.lastSettings);
            }
        });
    }

    private lastSettings: TimeSettings = {};
    
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

    private startUpdateInterval(action: any, settings: TimeSettings) {
        // Clear any existing interval
        this.stopUpdateInterval();
        
        // Get interval in milliseconds (default to 60 seconds)
        const interval = parseInt(settings.updateInterval || "60") * 1000;
        if (isNaN(interval) || interval <= 0) {
            console.error('Invalid update interval:', settings.updateInterval);
            return;
        }

        // Store the current action
        this.currentAction = action;

        // Fetch immediately
        this.fetchTime(action, settings);
        
        // Set up the interval
        this.updateInterval = setInterval(() => {
            if (this.currentAction) {
                this.fetchTime(this.currentAction, settings);
            }
        }, interval);
    }

    private stopUpdateInterval() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        this.currentAction = null;
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

        this.lastSettings = newSettings;
        
        // Wait for global settings to be available
        await this.waitForGlobalSettings();
        
        console.log("Time display will appear with settings:", newSettings);
        this.startUpdateInterval(ev.action, newSettings);
    }

    override async onWillDisappear(ev: WillDisappearEvent<TimeSettings>): Promise<void> {
        console.log("Time display will disappear");
        this.stopUpdateInterval();
    }

    override async onKeyDown(ev: KeyDownEvent<TimeSettings>): Promise<void> {
        console.log("Time display key down with settings:", ev.payload.settings);
        await this.fetchTime(ev.action, ev.payload.settings);
    }

    override onDidReceiveSettings(ev: DidReceiveSettingsEvent<TimeSettings>): void {
        console.log("Time display did receive settings:", ev.payload.settings);
        // The `fetchTime` call below uses the latest settings from `ev.payload.settings`
        this.fetchTime(ev.action, ev.payload.settings);
    }

    private async fetchTime(action: any, settings: TimeSettings): Promise<void> {
        try {
            // Use global baseUrl if available, otherwise fall back to instance settings or default
            const baseUrl = this.globalSettings?.baseUrl?.trim() || 
                           (settings.baseUrl && settings.baseUrl.trim() ? settings.baseUrl.trim() : DEFAULT_BASE_URL);
            
            console.log('Using base URL:', baseUrl);
            const displayFormat = settings.displayFormat || DEFAULT_DISPLAY_FORMAT;
            const titlePosition = settings.titlePosition || DEFAULT_TITLE_POSITION;
            console.log("Using display format:", displayFormat);
            console.log("Using title position:", titlePosition);
            
            if (!baseUrl) {
                console.error("Base URL not configured");
                await action.setTitle("No URL");
                return;
            }

            // Ensure there's exactly one slash between baseUrl and the endpoint
            const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
            const url = `${normalizedBaseUrl}/time`;
            console.log("Fetching time from:", url);
            
            try {
                const response = await fetch(url);
                console.log("Response status:", response.status);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const text = await response.text();
                console.log("Raw response:", text);
                
                try {
                    const data = JSON.parse(text) as TimeResponse;
                    console.log("Parsed time data:", data);
                    
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
                    
                    // Combine custom title with display text based on position
                    const finalDisplayText = settings.customTitle 
                        ? titlePosition === "top"
                            ? `${settings.customTitle}\n${displayText}`
                            : `${displayText}\n${settings.customTitle}`
                        : displayText;
                    
                    console.log("Setting title to:", finalDisplayText);
                    await action.setTitle(finalDisplayText);
                    // Only update lastUpdate, do not overwrite displayFormat here if it was just set
                    await action.setSettings({ ...settings, lastUpdate: displayText });
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