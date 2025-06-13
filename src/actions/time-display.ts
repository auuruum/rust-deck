import { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";

interface TimeSettings {
    baseUrl?: string;
    lastUpdate?: string;
    [key: string]: string | undefined;
}

interface TimeResponse {
    server_time: string;
}

const DEFAULT_BASE_URL = "http://localhost:8080";

@action({ UUID: "com.aurum.rust-deck.time" })
export class TimeDisplay extends SingletonAction<TimeSettings> {
    override async onWillAppear(ev: WillAppearEvent<TimeSettings>): Promise<void> {
        console.log("Time display will appear with settings:", ev.payload.settings);
        await this.fetchTime(ev.action, ev.payload.settings);
    }

    override async onKeyDown(ev: KeyDownEvent<TimeSettings>): Promise<void> {
        console.log("Time display key down with settings:", ev.payload.settings);
        await this.fetchTime(ev.action, ev.payload.settings);
    }

    private async fetchTime(action: any, settings: TimeSettings): Promise<void> {
        try {
            const baseUrl = settings.baseUrl && settings.baseUrl.trim() !== "" ? settings.baseUrl : DEFAULT_BASE_URL;
            console.log("Using base URL:", baseUrl);
            
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
                    
                    if (data && data.server_time) {
                        console.log("Setting title to:", data.server_time);
                        await action.setTitle(data.server_time);
                        await action.setSettings({ ...settings, lastUpdate: data.server_time });
                    } else {
                        console.error("Invalid response format - missing server_time:", data);
                        await action.setTitle("Invalid");
                    }
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