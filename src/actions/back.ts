import streamDeck, { action, KeyDownEvent, SingletonAction } from "@elgato/streamdeck";

@action({ UUID: "com.aurum.rust-deck.back" })
export class Back extends SingletonAction {
    /**
     * Occurs when the user presses the key action.
     */
    override onKeyDown(ev: KeyDownEvent): void | Promise<void> {
        // Passing undefined as the profile name will switch back to the previous profile
        streamDeck.profiles.switchToProfile(ev.action.device.id, undefined);
    }
}
