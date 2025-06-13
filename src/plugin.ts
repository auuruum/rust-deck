import { LogLevel, streamDeck } from "@elgato/streamdeck";

import { IncrementCounter } from "./actions/increment-counter";
import { TimeDisplay } from "./actions/time-display";
import { initializeGlobalSettings } from "./settings";

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information (e.g. access tokens, etc.) make sure to disable logging so that the information isn't recorded in the log files.
streamDeck.logger.setLevel(LogLevel.TRACE);

// Initialize global settings
initializeGlobalSettings().catch(error => {
    console.error("Failed to initialize global settings:", error);
});

// Register the increment action.
streamDeck.actions.registerAction(new IncrementCounter());
// Register the time display action
streamDeck.actions.registerAction(new TimeDisplay());

// Finally, connect to the Stream Deck.
streamDeck.connect();
