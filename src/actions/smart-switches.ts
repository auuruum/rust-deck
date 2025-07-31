import streamDeck, { action, KeyDownEvent, SingletonAction } from "@elgato/streamdeck";

@action({ UUID: "com.elgato.example.smart-switches" })
export class SmartSwitches extends SingletonAction {
	/**
	 * Occurs when the user presses the key action.
	 */
	override onKeyDown(ev: KeyDownEvent<CounterSettings>): void | Promise<void> {
		streamDeck.profiles.switchToProfile(ev.action.device.id, "Smart Switches"); 
	}
}

type CounterSettings = {
	count: number;
};