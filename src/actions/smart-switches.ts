import streamDeck, { action, KeyDownEvent, SingletonAction } from "@elgato/streamdeck";

@action({ UUID: "com.aurum.rust-deck.smart-switches" })
export class SmartSwitches extends SingletonAction {
	/**
	 * Occurs when the user presses the key action.
	 */
	override async onKeyDown(ev: KeyDownEvent): Promise<void> {
		// Set global variable to indicate we want to show smart switches
		await streamDeck.settings.setGlobalSettings({
			...(await streamDeck.settings.getGlobalSettings()),
			profileType: "smart_switches"
		});
		
		// Switch to the profile
		streamDeck.profiles.switchToProfile(ev.action.device.id, "profiles/Rustplusplus"); 
	}
}