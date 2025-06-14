Settings
The Stream Deck SDK provides support for managing settings associated with your plugin. This is useful when you want to provide a higher level of configurability for your plugin, provide a persisted context to an action, or securely store an access token to an API, etc.

There are two types of settings:

Action settings - settings associated with one of your plugin's actions.
Global settings - plugin-wide settings.
Both types of settings can only be accessed by the plugin they are associated with.

Overview
Global and action settings share similarities in their APIs, and both can be managed from either the application-layer, or property inspector (UI). Additionally, once settings have been set, the adjacent environment is notified of the update, for example:

When updated in the property inspector, the application-layer is notified.
When updated in the application-layer, and there is an active property inspector, the property inspector will notified.
The following table provides an overview of the common functions and events:

Action settings
Global settings
Writing:
ev.action.setSettings(settings)1
Reading:
ev.payload.settings
ev.action.getSettings()1
Changed:
SingletonAction.onDidReceiveSettings(handler)
streamDeck.settings.onDidReceiveSettings(handler)
1 available whilst the action is visible.

note
In this context, ev are event arguments associated with an event emitted within the SingletonAction or from streamDeck.* for events that are associated with an action.

info
Settings are persisted as JSON objects, meaning values can be boolean, number, string, null, arrays, or objects.

Action Settings
Writing Settings
Settings can be associated with an instance of an action to provide it context. This is useful when you want to allow a user to customize a specific action provided by your plugin, or the action has a state that it manages, for example a counter.

The following example demonstrates setting count to 1 when the Counter action key is pressed down.

Write to settings on key down
import streamDeck, { action, type KeyDownEvent, SingletonAction } from "@elgato/streamdeck";
@action({ UUID: "com.elgato.hello-world.counter" })
class Counter extends SingletonAction {
	/**
	 * Occurs when the user presses the key action.
	 */
	override async onKeyDown(ev: KeyDownEvent): Promise<void> {
		// Set the actions settings on key down.
		await ev.action.setSettings({
			count: 1,
		});
	}
}
streamDeck.actions.registerAction(new Counter());
streamDeck.connect();

Security
Security-sensitive settings, such as API keys, should always be persisted using global settings, never action settings. Action settings are stored as plain-text and are included when exporting Stream Deck profiles, and in their nature action settings are not secure.

Reading Settings
An action's settings are provided as part of the event arguments, for example when onWillAppear or onKeyDown occurs. By default, the settings' type is JsonObject and whilst this is fine when setting them, it isn't particularly useful when reading them. To fix this, a type that represents the settings should be defined separately, and provided when declaring the class.

The following example demonstrates defining the settings' type to provide intellisense when reading the settings from the event arguments:

Using types with settings
import streamDeck, { action, type KeyDownEvent, SingletonAction } from "@elgato/streamdeck";
// Define the action's settings type.
type Settings = {
	count: number;
};
@action({ UUID: "com.elgato.hello-world.counter" })
class Counter extends SingletonAction<Settings> {
	/**
	 * Occurs when the user presses the key action.
	 */
	override async onKeyDown(ev: KeyDownEvent<Settings>): Promise<void> {
		// `ev.payload.settings` now contains typed-settings.
		// Set the actions settings on key down.
		await ev.action.setSettings({
			count: 1,
		});
	}
}
streamDeck.actions.registerAction(new Counter());
streamDeck.connect();

Type safety
Defining the type of your settings provides insight into what their type might be, but does not guarantee their underlying type. Learn more about type-safety to prevent runtime errors.

Event argument types
In the above the KeyDownEvent includes the settings type Settings to provide typing. This is also possible of other event arguments for events within the SingletonAction action, including:

onDialDown, onDialRotate, onDialUp, onTouchTap.
onDidReceiveSettings.
onKeyDown, onKeyUp.
onTitleParametersDidChange.
onWillAppear, onWillDisappear.
The following example demonstrates reading the settings as part of the onKeyDown event, and incrementing the count by one, and then updating the action's settings.

Access settings via event payload
import streamDeck, { action, type KeyDownEvent, SingletonAction } from "@elgato/streamdeck";
// Define the action's settings type.
type Settings = {
	count: number;
};
@action({ UUID: "com.elgato.hello-world.counter" })
class Counter extends SingletonAction<Settings> {
	/**
	 * Occurs when the user presses the key action.
	 */
	override async onKeyDown(ev: KeyDownEvent<Settings>): Promise<void> {
		// Read the current count.
		let { count = 0 } = ev.payload.settings; 
		count++;
		// Set the new count.
		await ev.action.setSettings({ count });
	}
}
streamDeck.actions.registerAction(new Counter());
streamDeck.connect();

info
You can also request a visible action's settings using ev.action.getSettings(); as there is no guarantee the action will be visible, we recommend using the settings supplied as part of the event arguments where possible.

Settings Changed
Upon the settings of an action being set in the property inspector, your application-layer will receive an event allowing you to react accordingly, for example your plugin could set the image of the action based on the user's selection of a drop down:

Receive settings callback
import streamDeck, { action, type DidReceiveSettingsEvent, SingletonAction } from "@elgato/streamdeck";
// Define the action's settings type.
type Settings = {
	count: number;
};
@action({ UUID: "com.elgato.hello-world.counter" })
class Counter extends SingletonAction<Settings> {
	/**
	 * Occurs when the application-layer receives the settings from the UI.
	 */
	override onDidReceiveSettings(ev: DidReceiveSettingsEvent<Settings>): void {
		// Handle the settings changing in the property inspector (UI).
	}
}
streamDeck.actions.registerAction(new Counter());
streamDeck.connect();

Global Settings
Writing Settings
Global settings are persisted at the plugin-level, and are accessible only to the plugin that persisted them.

The following example demonstrates setting the global settings from the application-layer after receiving a deep-link message:

Write global settings from plugin
import streamDeck from "@elgato/streamdeck";
streamDeck.system.onDidReceiveDeepLink((ev) => {
	// Set the global settings after receiving a deep-link.
	streamDeck.settings.setGlobalSettings({
		messageReceived: true,
	});
});
streamDeck.connect();

Security
Security-sensitive settings, such as access tokens, should always be persisted using global settings as these are stored securely on the user's local machine. However, as these are stored locally, users can access them. We therefore recommend you:

Do:use global settings for user-specific settings, for example OAuth2 access tokens or API keys provided by the user.
Do:use global settings for non-sensitive plugin-level settings.
Don't:use global settings for your plugin's secrets, for example API keys.
Reading Settings
Retrieving global settings is achieved using getGlobalSettings found in the settings namespace, for example:

Get global settings in plugin
import streamDeck from "@elgato/streamdeck";
streamDeck.system.onDidReceiveDeepLink(async (ev) => {
	// Get the settings.
	const settings = await streamDeck.settings.getGlobalSettings();
});
streamDeck.connect();

When retrieving the global settings, the result has a type of JsonObject which does not allow intellisense to provide suggestions. To overcome this limitation, a type may be provided as part of the call to request the settings. The following combines the reading and writing examples, updated to demonstrate how typed settings can be used to track the number of deep-link messages received.

Using types with global settings
import streamDeck from "@elgato/streamdeck";
// Define a type that represents the settings.
type Settings = {
	count: number;
};
streamDeck.system.onDidReceiveDeepLink(async (ev) => {
	// When getting the settings, supply the type.
	let { count = 0 } = await streamDeck.settings.getGlobalSettings<Settings>();
	count++;
	await streamDeck.settings.setGlobalSettings({ count });
});
streamDeck.connect();

Type safety
Defining the type of your settings provides insight into what their type might be, but does not guarantee their underlying type. Learn more about type-safety to prevent runtime errors.

Settings Changed
In addition to explicitly requesting the global settings, the application-layer and property inspector can subscribe to an event to be notified when the other updates the global settings. For example, the property inspector can listen to changes to global settings made by the application-layer in the following way:

Global settings callback
import streamDeck from "@elgato/streamdeck";
streamDeck.settings.onDidReceiveGlobalSettings((ev) => {
	// Handle the global settings changing in application layer.
});

tip
The application-layer can also listen for the global settings changing in the property inspector using onDidReceiveGlobalSettings in the settings namespace.

Type Safety
TypeScript types provide good insight into what values might be, but do not guarantee the types of values. The following example demonstrates how runtime errors can occur, even with types.

Bad: Example of how runtime errors can occur
import { type KeyDownEvent, SingletonAction } from "@elgato/streamdeck";
type Settings = {
	name: string;
};
export class MyAction extends SingletonAction<Settings> {
	/**
	 * Occurs when the user presses the key action.
	 */
	override async onKeyDown(ev: KeyDownEvent<Settings>): Promise<void> {
		/*
		 * Even though the settings are typed, if they have not
		 * been previously set, their values will be undefined.
		 */
		const { name } = await ev.action.getSettings();
		name.toLowerCase(); // Runtime error!
	}
}

To reduce runtime errors with data, you should always the check values before attempting to use them. When using values that might not be safe, we recommend:

Use default values when destructuring objects that might be nullish.
For complex types, consider using a schema validation library such as Zod.
The following example demonstrates using Zod to validate settings.

Example of using Zod to validate data
import { type KeyDownEvent, SingletonAction } from "@elgato/streamdeck";
import z from "zod";
// Define the Zod schema.
const Settings = z.object({
	name: z.string().default("Elgato"),
});
// Infer the settings type.
type Settings = z.infer<typeof Settings>;
/**
 * An example action that demonstrates parsing settings with Zod.
 */
export class MyAction extends SingletonAction<Settings> {
	/**
	 * Occurs when the user presses the key action.
	 */
	override async onKeyDown(ev: KeyDownEvent<Settings>): Promise<void> {
		/*
		 * Settings can safely be undefined here, Zod
		 * will fallback `name` to "Elgato".
		 */
		const { name } = Settings.parse(ev.payload.settings);
		name.toLowerCase(); // "elgato"
	}
}