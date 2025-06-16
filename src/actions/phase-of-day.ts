import { action, KeyDownEvent, SingletonAction, WillAppearEvent, DidReceiveSettingsEvent, streamDeck, WillDisappearEvent } from "@elgato/streamdeck";
import { GlobalSettings } from "../settings";

interface PhaseSettings {
    baseUrl?: string;
    lastUpdate?: string;
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
const DEFAULT_TITLE_POSITION = "top";
const DEFAULT_UPDATE_INTERVAL = "30";

@action({ UUID: "com.aurum.rust-deck.phase-of-day" })
export class PhaseOfDay extends SingletonAction<PhaseSettings> {
    private globalSettings: GlobalSettings = { baseUrl: DEFAULT_BASE_URL };
    private updateInterval: NodeJS.Timeout | null = null;
    private currentAction: any = null;
    private lastSettings: PhaseSettings = {};

    constructor() {
        super();
        this.loadGlobalSettings().then(() => {
            console.log('Global settings loaded in constructor:', this.globalSettings);
        });
        
        streamDeck.settings.onDidReceiveGlobalSettings(({ settings }) => {
            this.globalSettings = settings as GlobalSettings;
            console.log('Global settings updated:', this.globalSettings);
            if (this.currentAction) {
                this.fetchPhase(this.currentAction, this.lastSettings);
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

    private startUpdateInterval(action: any, settings: PhaseSettings) {
        this.stopUpdateInterval();
        
        const interval = parseInt(settings.updateInterval || DEFAULT_UPDATE_INTERVAL) * 1000;
        if (isNaN(interval) || interval <= 0) {
            console.error('Invalid update interval:', settings.updateInterval);
            return;
        }

        console.log(`Starting update interval for phase display: ${interval}ms`);

        this.currentAction = action;
        this.lastSettings = settings;

        this.fetchPhase(action, settings);
        
        this.updateInterval = setInterval(() => {
            if (this.currentAction) {
                this.fetchPhase(this.currentAction, settings);
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

    override async onWillAppear(ev: WillAppearEvent<PhaseSettings>): Promise<void> {
        const currentSettings = ev.payload.settings;
        let settingsChanged = false;
        const newSettings = { ...currentSettings };

        if (!currentSettings.titlePosition) {
            newSettings.titlePosition = DEFAULT_TITLE_POSITION;
            settingsChanged = true;
        }
        if (!currentSettings.updateInterval) {
            newSettings.updateInterval = DEFAULT_UPDATE_INTERVAL;
            settingsChanged = true;
        }
        
        if (settingsChanged) {
            await ev.action.setSettings(newSettings);
        }

        await this.waitForGlobalSettings();
        
        console.log("Phase display will appear with settings:", newSettings);
        this.startUpdateInterval(ev.action, newSettings);
    }

    override async onWillDisappear(ev: WillDisappearEvent<PhaseSettings>): Promise<void> {
        console.log("Phase display will disappear");
        this.stopUpdateInterval();
    }

    override async onKeyDown(ev: KeyDownEvent<PhaseSettings>): Promise<void> {
        console.log("Phase display key down with settings:", ev.payload.settings);
        await this.fetchPhase(ev.action, ev.payload.settings);
    }

    override onDidReceiveSettings(ev: DidReceiveSettingsEvent<PhaseSettings>): void {
        console.log("Phase display did receive settings:", ev.payload.settings);
        this.startUpdateInterval(ev.action, ev.payload.settings);
    }

    private async fetchPhase(action: any, settings: PhaseSettings): Promise<void> {
        try {
            const baseUrl = this.globalSettings?.baseUrl?.trim() || 
                           (settings.baseUrl && settings.baseUrl.trim() ? settings.baseUrl.trim() : DEFAULT_BASE_URL);
            
            const titlePosition = settings.titlePosition || DEFAULT_TITLE_POSITION;
            console.log('Using base URL:', baseUrl);
            
            if (!baseUrl) {
                console.error("Base URL not configured");
                await action.setTitle("No URL");
                return;
            }

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
                    
                    const phaseText = `${data.isDay ? "🌙" : "☀️"}${data.timeTillChange}`;
                    
                    // Combine custom title with phase text based on position
                    const finalDisplayText = settings.customTitle 
                        ? titlePosition === "top"
                            ? `${settings.customTitle}\n${phaseText}`
                            : `${phaseText}\n${settings.customTitle}`
                        : phaseText;
                    
                    console.log("Setting title to:", finalDisplayText);
                    await action.setTitle(finalDisplayText);
                    await action.setSettings({ ...settings, lastUpdate: phaseText });
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
            console.error("Error in fetchPhase:", error);
            await action.setTitle("Error");
        }
    }
}
