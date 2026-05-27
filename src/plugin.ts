import { LogLevel, streamDeck } from "@elgato/streamdeck";

import { TimeDisplay } from "./actions/time-display";
import { ServerInfo } from "./actions/server-info";
import { PhaseOfDay } from "./actions/phase-of-day";
import { ProfileAction } from "./actions/profile-action";
import { SmartDevices } from "./actions/smart-devices";
import { Trackers } from "./actions/trackers";
import { JoinServer } from "./actions/join-server";
import { initializeGlobalSettings, getApiPassword, getBaseUrl, updateGlobalSettingsCache } from "./settings";
import { wsClient } from "./websocket";

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information (e.g. access tokens, etc.) make sure to disable logging so that the information isn't recorded in the log files.
streamDeck.logger.setLevel(LogLevel.TRACE);

// Initialize global settings
initializeGlobalSettings().then(() => {
    wsClient.connectFromBaseUrl(getBaseUrl(), getApiPassword());
}).catch(error => {
    console.error("Failed to initialize global settings:", error);
});

streamDeck.settings.onDidReceiveGlobalSettings(({ settings }) => {
    updateGlobalSettingsCache(settings);
    wsClient.connectFromBaseUrl(getBaseUrl(), getApiPassword());
});

// Register the time display action
streamDeck.actions.registerAction(new TimeDisplay());
// Register the server info action
streamDeck.actions.registerAction(new ServerInfo());
// Register the phase of day action
streamDeck.actions.registerAction(new PhaseOfDay());
// Register the smart devices action
streamDeck.actions.registerAction(new SmartDevices());
// Register the trackers action
streamDeck.actions.registerAction(new Trackers());
// Register the join server action
streamDeck.actions.registerAction(new JoinServer());
// Register the profile action
streamDeck.actions.registerAction(new ProfileAction());


// Connect to Stream Deck
streamDeck.connect();
