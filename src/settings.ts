import { streamDeck } from "@elgato/streamdeck";

export interface GlobalSettings {
    baseUrl: string;
    [key: string]: string | undefined;
}

const defaultSettings: GlobalSettings = {
    baseUrl: "http://localhost:8080"
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

export async function setGlobalSettings(settings: Partial<GlobalSettings>): Promise<void> {
    console.log("Setting global settings:", settings);
    globalSettings = { ...globalSettings, ...settings };
    await streamDeck.settings.setGlobalSettings(globalSettings);
}

// Initialize settings when the module loads
initializeGlobalSettings().catch(error => {
    console.error("Failed to initialize global settings:", error);
}); 