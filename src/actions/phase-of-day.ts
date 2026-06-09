import { action, KeyDownEvent, SingletonAction, WillAppearEvent, DidReceiveSettingsEvent, streamDeck, WillDisappearEvent } from "@elgato/streamdeck";
import { GlobalSettings } from "../settings";
import { wsClient } from "../websocket";

interface PhaseSettings {
    baseUrl?: string;
    lastUpdate?: string;
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
const DEFAULT_TITLE_POSITION = "top";

@action({ UUID: "com.aurum.rust-deck.phase-of-day" })
export class PhaseOfDay extends SingletonAction<PhaseSettings> {
    private globalSettings: GlobalSettings = { baseUrl: DEFAULT_BASE_URL };
    private currentAction: any = null;
    private lastSettings: PhaseSettings = {};
    private lastTimeData: TimeResponse | null = null;

    constructor() {
        super();
        wsClient.on("time", async (data: TimeResponse) => {
            if (!this.currentAction || !data || typeof data.isDay !== "boolean") return;
            this.lastTimeData = data;
            await this.applyPhaseData(this.currentAction, data, this.lastSettings);
        });

        this.loadGlobalSettings().then(() => {
            console.log('Global settings loaded in constructor:', this.globalSettings);
        });
        
        streamDeck.settings.onDidReceiveGlobalSettings(({ settings }) => {
            this.globalSettings = settings as GlobalSettings;
            console.log('Global settings updated:', this.globalSettings);
            if (this.currentAction) {
                this.refreshPhase(this.currentAction, this.lastSettings);
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

    private startRealtime(action: any, settings: PhaseSettings) {
        this.currentAction = action;
        this.lastSettings = settings;

        this.refreshPhase(action, settings);
    }

    private stopRealtime() {
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
        if (settingsChanged) {
            await ev.action.setSettings(newSettings);
        }

        await this.waitForGlobalSettings();
        
        console.log("Phase display will appear with settings:", newSettings);
        this.startRealtime(ev.action, newSettings);
    }

    override async onWillDisappear(ev: WillDisappearEvent<PhaseSettings>): Promise<void> {
        console.log("Phase display will disappear");
        this.stopRealtime();
    }

    override async onKeyDown(ev: KeyDownEvent<PhaseSettings>): Promise<void> {
        console.log("Phase display key down with settings:", ev.payload.settings);
        await this.refreshPhase(ev.action, ev.payload.settings);
    }

    override onDidReceiveSettings(ev: DidReceiveSettingsEvent<PhaseSettings>): void {
        console.log("Phase display did receive settings:", ev.payload.settings);
        this.startRealtime(ev.action, ev.payload.settings);
    }

    private async refreshPhase(action: any, settings: PhaseSettings): Promise<void> {
        if (await this.applyLatestWsData(action, settings)) return;
        await this.fetchPhase(action, settings);
    }

    private async applyLatestWsData(action: any, settings: PhaseSettings): Promise<boolean> {
        const latest = wsClient.getLatestData().time as TimeResponse | undefined;
        const data = latest || this.lastTimeData;
        if (!data || typeof data.isDay !== "boolean") {
            return false;
        }

        this.lastTimeData = data;
        await this.applyPhaseData(action, data, settings);
        return true;
    }

    private async applyPhaseData(action: any, data: TimeResponse, settings: PhaseSettings): Promise<void> {
        const titlePosition = settings.titlePosition || DEFAULT_TITLE_POSITION;
        const phaseText = data.timeTillChange === null ? "Wait" : `${data.timeTillChange}\n${data.isDay ? "Night" : "Day"}`;
        const finalDisplayText = settings.customTitle
            ? titlePosition === "top"
                ? `${settings.customTitle}\n${phaseText}`
                : `${phaseText}\n${settings.customTitle}`
            : phaseText;

        await action.setTitle(finalDisplayText);
        if (settings.lastUpdate !== phaseText) {
            await action.setSettings({ ...settings, lastUpdate: phaseText });
        }
    }

    private async fetchPhase(action: any, settings: PhaseSettings): Promise<void> {
        try {
            const baseUrl = this.globalSettings?.baseUrl?.trim() || 
                           (settings.baseUrl && settings.baseUrl.trim() ? settings.baseUrl.trim() : DEFAULT_BASE_URL);
            
            console.log('Using base URL:', baseUrl);
            
            if (!baseUrl) {
                console.error("Base URL not configured");
                await action.setTitle("No URL");
                return;
            }

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
                    await this.applyPhaseData(action, data, settings);
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
