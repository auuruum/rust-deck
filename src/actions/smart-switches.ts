import streamDeck, { action, KeyDownEvent, SingletonAction } from "@elgato/streamdeck";

@action({ UUID: "com.aurum.rust-deck.smart-switches" })
export class SmartSwitches extends SingletonAction {
	/**
	 * Occurs when the user presses the key action.
	 */
	override onKeyDown(ev: KeyDownEvent<CounterSettings>): void | Promise<void> {
		streamDeck.profiles.switchToProfile(ev.action.device.id, "profiles/Smart Switches"); 
	}
}

type CounterSettings = {
	count: number;
};