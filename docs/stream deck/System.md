System
The Stream Deck SDK provides utilities to streamline interacting with common system functionality, such as monitoring an app launching or terminating and receiving deep-links. In addition to these, the following utilities are available.

Opening URLs
There may be occasions when your plugin needs to direct the user to a website in their browser, for example when authenticating a service, or when the user is seeking help. This can be achieved with the following utility:

Open URL from plugin
import streamDeck from "@elgato/streamdeck";
streamDeck.actions.onKeyDown(() => {
	streamDeck.system.openUrl("https://elgato.com");
});
streamDeck.connect();

The above example will open https://elgato.com in the user's default browser.

note
All URLs are opened in the user's default browser. Custom URL schemes, for example my-app:// are not yet supported by the SDK.

System Wake
Handling system wake correctly is an important part of ensuring your plugin resumes seamlessly. As part of the system wake procedure, your plugin will receive the following events:

onWillAppear for all visible actions.
A one-time onSystemDidWakeUp event.
The latter systemDidWakeUp event can be used to restore connections / state, for example a websocket connection with an API, or IPC with local app. Listening for this event is achieved with the following:

System wake callback
import streamDeck from "@elgato/streamdeck";
streamDeck.system.onSystemDidWakeUp((ev) => {
	// Handle system wake.
});
streamDeck.connect();