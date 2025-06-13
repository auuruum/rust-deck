import { action, KeyDownEvent, SingletonAction, WillAppearEvent, DidReceiveSettingsEvent } from "@elgato/streamdeck";

interface TimeSettings {
    baseUrl?: string;
    lastUpdate?: string;
    displayFormat?: string;
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

@action({ UUID: "com.aurum.rust-deck.time" })
export class TimeDisplay extends SingletonAction<TimeSettings> {
    override async onWillAppear(ev: WillAppearEvent<TimeSettings>): Promise<void> {
        const currentSettings = ev.payload.settings;
        if (!currentSettings.displayFormat) {
            // If displayFormat is not set, set it to the default and save settings
            await ev.action.setSettings({ ...currentSettings, displayFormat: DEFAULT_DISPLAY_FORMAT });
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
            const baseUrl = settings.baseUrl && settings.baseUrl.trim() !== "" ? settings.baseUrl : DEFAULT_BASE_URL;
            const displayFormat = settings.displayFormat || DEFAULT_DISPLAY_FORMAT;
            console.log("Using base URL:", baseUrl);
            console.log("Using display format:", displayFormat);
            
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
                    
                    console.log("Setting title to:", displayText);
                    await action.setTitle(displayText);
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