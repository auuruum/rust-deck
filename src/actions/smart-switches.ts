import { action, KeyDownEvent, SingletonAction, streamDeck } from "@elgato/streamdeck";

interface SmartSwitchesSettings {
    [key: string]: string | undefined;
}

@action({ UUID: "com.aurum.rust-deck.smart-switches" })
export class SmartSwitches extends SingletonAction<SmartSwitchesSettings> {
    override async onKeyDown(ev: KeyDownEvent<SmartSwitchesSettings>): Promise<void> {
        // Switch to the bundled profile named "Smart Switches"
        if (ev.action.device?.id) {
            try {
                await streamDeck.profiles.switchToProfile(ev.action.device.id, "Smart Switches");
            } catch (error) {
                // If profile switching fails, we can handle it gracefully
                console.log("Profile switch failed:", error);
            }
        }
    }
}
