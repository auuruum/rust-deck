Devices
The Stream Deck SDK provides a list of available Stream Deck devices.

Array of available devices
import streamDeck from "@elgato/streamdeck";
streamDeck.devices.forEach((device) => {
	const { id, isConnected, name, size, type } = device;
	streamDeck.logger.info(name); // Stream Deck Neo, Stream Deck +
});

Devices Connecting
Your plugin can monitor when a Stream Deck device is connected using the onDeviceDidConnect event.

Device connected callback
import streamDeck, { DeviceDidConnectEvent } from "@elgato/streamdeck";
streamDeck.devices.onDeviceDidConnect((ev: DeviceDidConnectEvent) => {
	const { id, isConnected, name, size, type } = ev.device;
	streamDeck.logger.info(name);
});

Devices Disconnecting
Your plugin can monitor when a Stream Deck device disconnects using the onDeviceDidDisconnect event.

Device disconnected callback
import streamDeck, { DeviceDidDisconnectEvent } from "@elgato/streamdeck";
streamDeck.devices.onDeviceDidDisconnect((ev: DeviceDidDisconnectEvent) => {
	const { id, isConnected, name, size, type } = ev.device;
	streamDeck.logger.info(name);
});

Disconnected Device Visibility
While you can use these events to optimize resource utilization, the keys/encoders can still be visible in the Stream Deck app while the hardware is disconnected.

Hardware
Stream Deck hardware comes in many form factors.

Stream Deck Neo
8 customizable LCD keys.
2 capacitive touch buttons for paging.
Stream Deck Neo
Stream Deck MK.2
15 customizable LCD keys.
Stream Deck MK.2
Stream Deck +
8 customizable LCD keys.
4 dials with rotation and press, with touch strip.
Stream Deck Plus
Stream Deck XL
32 customizable LCD keys.
Stream Deck XL
Stream Deck Mini
6 customizable LCD keys.
Stream Deck Mini
Stream Deck Pedal
3 customizable pedals.
Stream Deck Pedal
Stream Deck Mobile
Up to 64 customizable LCD keys.
Stream Deck Mobile
SCUF Controller
5 customizable macro buttons.
Scuf Controller
Corsair G-Keys
6 customizable macro keys.
Corsair Keyboard
Corsair Voyager
Up to 10 customizable capacitive keys