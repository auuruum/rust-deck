import { LogLevel, streamDeck } from "@elgato/streamdeck";

import { TimeDisplay } from "./actions/time-display";
import { ServerInfo } from "./actions/server-info";
import { PhaseOfDay } from "./actions/phase-of-day";
import { initializeGlobalSettings } from "./settings";

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information (e.g. access tokens, etc.) make sure to disable logging so that the information isn't recorded in the log files.
streamDeck.logger.setLevel(LogLevel.TRACE);

// Initialize global settings
initializeGlobalSettings().catch(error => {
    console.error("Failed to initialize global settings:", error);
});

// Register the time display action
streamDeck.actions.registerAction(new TimeDisplay());
// Register the server info action
streamDeck.actions.registerAction(new ServerInfo());
// Register the phase of day action
streamDeck.actions.registerAction(new PhaseOfDay());

// Connect to Stream Deck
streamDeck.connect();
