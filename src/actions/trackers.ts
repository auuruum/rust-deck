import streamDeck, { action, KeyDownEvent, SingletonAction } from "@elgato/streamdeck";

@action({ UUID: "com.aurum.rust-deck.trackers" })
export class Trackers extends SingletonAction {
	/**
	 * Occurs when the user presses the key action.
	 */
	override async onKeyDown(ev: KeyDownEvent<any>): Promise<void> {
		const actionSettings = await ev.action.getSettings();
		const globalSettings = await streamDeck.settings.getGlobalSettings();

		// Set global settings to pass the profile type
		await streamDeck.settings.setGlobalSettings({
			...globalSettings,
			profileType: "trackers",
			...(typeof actionSettings.baseUrl === "string" && actionSettings.baseUrl.trim()
				? { baseUrl: actionSettings.baseUrl.trim() }
				: {}),
			...(typeof actionSettings.apiPassword === "string"
				? { apiPassword: actionSettings.apiPassword }
				: {})
		});

		// Switch to the profile
		streamDeck.profiles.switchToProfile(ev.action.device.id, "profiles/Rustplusplus");
	}
}
