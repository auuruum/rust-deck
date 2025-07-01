Deep-Linking
Deep-linking is the process of sending messages to local apps via custom URL scheme registered on the user's device, for example a computer or mobile phone. This can be useful when:

Handling callbacks from an authorization provider (OAuth2).
Configuring a local IPC between two local apps.
Receiving settings from a separate integration.
Stream Deck SDK streamlines the process of deep-linking by providing plugins with a unique URL that allows them to receive deep-link messages under the pre-registered streamdeck:// scheme.

Receiving Messages
Handling inbound deep-link messages can be achieved with the onDidReceiveDeepLink event handler found in the system namespace, for example:

Deep-link event callback
import streamDeck from "@elgato/streamdeck";
streamDeck.system.onDidReceiveDeepLink((ev) => {
	// Handle the deep-link message
});
streamDeck.connect();

With a handler function registered, your plugin is now set up to receive deep-link messages.

Deep-Link URL
Each plugin has a unique URL based on their unique identifier using the following format:

streamdeck://plugins/message/<PLUGIN_UUID>

With this URL, the plugin is able to receive inbound deep-link messages in the form of a URL that follows the RFC-3986 structure:

streamdeck://plugins/message/<PLUGIN_UUID>[path]["?" query]["#" fragment]

For example:

                                                              href
                                                   ┌───────────┴───────────┐
streamdeck://plugins/message/com.elgato.hello-world/hello?name=Elgato#waving
                                                   └─┬──┘ └────┬────┘ └─┬──┘
                                                    path      query    fragment

note
Deep-link URLs are parsed using the native URL API. When parsing the URL, the prefix is ignored, i.e. streamdeck://plugins/message/<PLUGIN_UUID>. The full

Example
Given the following event handler:

Reading a deep-link message
import streamDeck from "@elgato/streamdeck";
streamDeck.system.onDidReceiveDeepLink((ev) => {
	const { path, fragment } = ev.url;
	streamDeck.logger.info(`Path = ${path}`);
	streamDeck.logger.info(`Fragment = ${fragment}`);
});
streamDeck.connect();

To send a message to the plugin with the unique identifier com.elgato.hello-world, you would submit the following URL:

streamdeck://plugins/message/com.elgato.hello-world/Hello%20world#Testing

Which would then log the following:

Path = /Hello%20world
Fragment = Testing

tip
To test deep-linking, enter the URL in your browsers URL bar and press return. Alternatively, on Windows you can submit the URL directly in the Run panel, opened with Win + R.

Known Limitations
Some authorization providers do not accept custom URL schemes as a callback URL. If this is the case, consider using the OAuth2 redirect proxy.
Keep deep-link messages small (under 2,000 characters). If you need to transfer more data, consider using a WebSocket connection.
Deep-links are only accessible locally, and it is therefore not possible to receive deep-link messages from remote sources.
OAuth2 Redirect Proxy
warning
The OAuth2 redirect proxy is designed to assist with OAuth2 code grant flow for authorization providers that do not accept custom schemes as part of their callback URLs, for example streamdeck://.

It is recommended you use your plugin's deep-link URL as the callback URL unless absolutely necessary.

The OAuth2 redirect proxy is a remotely accessibly https:// URL that has the single responsibility of forwarding messages to Stream Deck plugins via deep-linking. Due to the sensitive nature of the redirect proxy, no information sent to the proxy is stored on Elgato servers.

The following diagram provides an overview of the flow:

Flow diagram that depicts OAuth2 authorization code grant flow; the callback of the authorization provider goes via the redirect proxy, which then forwards the message to the plugin via deep-linking
Redirect URL
The redirect URL follows a similar structure to the deep-link URL, and is uniquely identifiable based on your plugin's identifier. This unique URL should be supplied to the authorization provider as the callback URL when authenticating with OAuth2. The format is as follows:

https://oauth2-redirect.elgato.com/streamdeck/plugins/message/<PLUGIN_UUID>

Upon receiving a callback from an authorization provider, the request is forwarded to your plugin. Please note, only a subset of query parameters are forwarded when present, these are:

Query Parameter	Description
code	Authorization code to exchange for an access token.
state	Optional value supplied as part of requesting authorization.
scope	Specifies the level of access that was granted to the app.
error	Error returned by the authorization provider when unsuccessful.
URL Builder
Plugin UUID:
com.elgato.hello-world
Path:
auth
URLs:

Deep-link URL
streamdeck://plugins/message/com.elgato.hello-world/auth


Open in Stream Deck

OAuth2 redirect proxy URL
https://oauth2-redirect.elgato.com/streamdeck/plugins/message/com.elgato.hello-world/auth

OAuth2 redirect proxy URL (encoded)
https%3A%2F%2Foauth2-redirect.elgato.com%2Fstreamdeck%2Fplugins%2Fmessage%2Fcom.elgato.hello-world%2Fauth