import { LogLevel, streamDeck } from "@elgato/streamdeck";

import { TimeDisplay } from "./actions/time-display";
import { ServerInfo } from "./actions/server-info";
import { PhaseOfDay } from "./actions/phase-of-day";
import { ProfileAction } from "./actions/profile-action";
import { SmartDevices } from "./actions/smart-devices";
import { initializeGlobalSettings, getBaseUrl } from "./settings";
import { wsClient } from "./websocket";

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information (e.g. access tokens, etc.) make sure to disable logging so that the information isn't recorded in the log files.
streamDeck.logger.setLevel(LogLevel.TRACE);

// Initialize global settings
initializeGlobalSettings().then(() => {
    // Initialize WebSocket connection with baseUrl from settings
    try {
        const baseUrl = getBaseUrl();
        if (baseUrl) {
            // Parse baseUrl to get host for WebSocket connection
            const urlObj = new URL(baseUrl);
            const wsUrl = `ws://${urlObj.hostname}:8074`;
            console.log("Connecting to WebSocket server at:", wsUrl);
            wsClient.connect(wsUrl);
        }
    } catch (error) {
        console.error("Failed to initialize WebSocket connection:", error);
    }
}).catch(error => {
    console.error("Failed to initialize global settings:", error);
});

// Register the time display action
streamDeck.actions.registerAction(new TimeDisplay());
// Register the server info action
streamDeck.actions.registerAction(new ServerInfo());
// Register the phase of day action
streamDeck.actions.registerAction(new PhaseOfDay());
// Register the smart devices action
streamDeck.actions.registerAction(new SmartDevices());
// Register the profile action
streamDeck.actions.registerAction(new ProfileAction());


// Connect to Stream Deck
streamDeck.connect();
