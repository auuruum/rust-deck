import { action, KeyDownEvent, SingletonAction, WillAppearEvent, DidReceiveSettingsEvent, Target, streamDeck } from "@elgato/streamdeck";
import { GlobalSettings } from "../settings";

interface TimeSettings {
    baseUrl?: string;
    lastUpdate?: string;
    displayFormat?: string;
    customTitle?: string;
    titlePosition?: string;
    [key: string]: string | undefined;
}

interface TimeResponse {
    day_length: number;
    sunrise: string;
    sunset: string;
    time: string;
    raw_time: number;
}

const DEFAULT_BASE_URL = "http://localhost:8080";
const DEFAULT_DISPLAY_FORMAT = "time";
const DEFAULT_TITLE_POSITION = "top";

@action({ UUID: "com.aurum.rust-deck.time" })
export class TimeDisplay extends SingletonAction<TimeSettings> {
    private globalSettings: GlobalSettings = { baseUrl: DEFAULT_BASE_URL };

    constructor() {
        super();
        // Load global settings when the plugin starts
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
        console.log("Time display will appear with settings:", ev.payload.settings);
        await this.fetchTime(ev.action, ev.payload.settings);
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

            const url = `${baseUrl}/time`;
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
                            displayText = data.time;
                            break;
                        case "sunrise":
                            displayText = data.sunrise;
                            break;
                        case "sunset":
                            displayText = data.sunset;
                            break;
                        case "day_length":
                            displayText = `${data.day_length.toFixed(1)}m`;
                            break;
                        default:
                            displayText = data.time;
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