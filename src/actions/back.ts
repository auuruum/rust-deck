import streamDeck, {
  action,
  type KeyDownEvent,
  SingletonAction,
} from "@elgato/streamdeck";
import type { SingleActionPayload } from "@elgato/streamdeck/types/plugin/events";

type BackSettings = {
  previousProfile?: string;
};

@action({ UUID: "com.aurum.rust-deck.back" })
export class Back extends SingletonAction<BackSettings> {
  override async onKeyDown(ev: KeyDownEvent<BackSettings>): Promise<void> {
    const payload = ev.payload as SingleActionPayload<BackSettings, "Keypad">;
    const deviceId = payload.device;

    const { previousProfile } = payload.settings;
    if (!previousProfile) {
      console.warn("No previousProfile stored in settings");
      return;
    }

    await streamDeck.profiles.switchToProfile(deviceId, previousProfile);
  }
}
