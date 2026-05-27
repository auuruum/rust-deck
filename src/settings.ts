import { streamDeck } from "@elgato/streamdeck";

export interface GlobalSettings {
    baseUrl: string;
    apiPassword?: string;
    [key: string]: string | undefined;
}

const defaultSettings: GlobalSettings = {
    baseUrl: "http://localhost:8074",
    apiPassword: ""
};

let globalSettings: GlobalSettings = { ...defaultSettings };

// Initialize global settings
export async function initializeGlobalSettings(): Promise<void> {
    try {
        const loadedSettings = await streamDeck.settings.getGlobalSettings();
        console.log("Loaded global settings:", loadedSettings);
        
        if (loadedSettings && typeof loadedSettings === 'object' && 'baseUrl' in loadedSettings) {
            globalSettings = loadedSettings as GlobalSettings;
            console.log("Using loaded global settings:", globalSettings);
        } else {
            console.log("Using default global settings:", defaultSettings);
            await streamDeck.settings.setGlobalSettings(defaultSettings);
        }
    } catch (error) {
        console.error("Failed to load global settings:", error);
        console.log("Using default global settings:", defaultSettings);
        await streamDeck.settings.setGlobalSettings(defaultSettings);
    }
}

export function getBaseUrl(): string {
    console.log("Getting base URL from settings:", globalSettings);
    return globalSettings.baseUrl || defaultSettings.baseUrl;
}

export function getApiPassword(): string {
    console.log("Getting API password from settings:", globalSettings.apiPassword ? "[REDACTED]" : "(empty)");
    return globalSettings.apiPassword || "";
}

export function updateGlobalSettingsCache(settings: unknown): void {
    if (settings && typeof settings === "object") {
        globalSettings = { ...defaultSettings, ...(settings as GlobalSettings) };
    }
}

export function createAuthHeaders(): HeadersInit {
    const apiPassword = getApiPassword();
    const headers: HeadersInit = {
        "Content-Type": "application/json"
    };
    
    if (apiPassword) {
        headers["X-API-Key"] = apiPassword;
    }
    
    return headers;
}

export async function setGlobalSettings(settings: Partial<GlobalSettings>): Promise<void> {
    console.log("Setting global settings:", settings);
    globalSettings = { ...globalSettings, ...settings };
    await streamDeck.settings.setGlobalSettings(globalSettings);
}

// Initialize settings when the module loads
initializeGlobalSettings().catch(error => {
    console.error("Failed to initialize global settings:", error);
});
