//C:\Users\aurum\Documents\GitHub\rust-deck\src\actions\smart-devices.ts
import streamDeck, { action, KeyDownEvent, SingletonAction } from "@elgato/streamdeck";

@action({ UUID: "com.aurum.rust-deck.smart-devices" })
export class SmartDevices extends SingletonAction {
	/**
	 * Occurs when the user presses the key action.
	 */
	override async onKeyDown(ev: KeyDownEvent<any>): Promise<void> {
		// Get the settings for this specific action instance
		const actionSettings = await ev.action.getSettings();

		// Prepare the settings to be passed to the profile
		const profileSettings = {
			profileType: "smart_devices",
			hideSwitches: actionSettings.hideSwitches ?? false,
			hideAlarms: actionSettings.hideAlarms ?? false,
			hideSwitchesGroups: actionSettings.hideSwitchesGroups ?? false,
		};

		// Set global settings to pass the configuration to the profile action
		await streamDeck.settings.setGlobalSettings({
			...(await streamDeck.settings.getGlobalSettings()),
			...profileSettings
		});

		// Switch to the profile
		streamDeck.profiles.switchToProfile(ev.action.device.id, "profiles/Rustplusplus");
	}
}