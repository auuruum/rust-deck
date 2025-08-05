//C:\Users\aurum\Documents\GitHub\rust-deck\src\actions\smart-devices.ts
import streamDeck, { action, KeyDownEvent, SingletonAction } from "@elgato/streamdeck";

@action({ UUID: "com.aurum.rust-deck.smart-devices" })
export class SmartDevices extends SingletonAction {
	/**
	 * Occurs when the user presses the key action.
	 */
	override async onKeyDown(ev: KeyDownEvent): Promise<void> {
		// Set global variable to indicate we want to show smart alarms
		await streamDeck.settings.setGlobalSettings({
			...(await streamDeck.settings.getGlobalSettings()),
			profileType: "smart_devices"
		});
		
		// Switch to the profile
		streamDeck.profiles.switchToProfile(ev.action.device.id, "profiles/Rustplusplus"); 
	}
}