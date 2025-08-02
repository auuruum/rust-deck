import {
  action,
  KeyDownEvent,
  SingletonAction,
  WillAppearEvent,
  streamDeck
} from "@elgato/streamdeck";
import type { JsonObject } from "@elgato/streamdeck";

@action({ UUID: "com.aurum.rust-deck.profile-action" })
export class ProfileAction extends SingletonAction<JsonObject> {
  override async onWillAppear(ev: WillAppearEvent<JsonObject>): Promise<void> {
    const coords = (ev.payload as any).coordinates;

    if (coords?.column === 4 && coords?.row === 2) {
      await ev.action.setTitle("Back");
    }
  }

  override async onKeyDown(ev: KeyDownEvent<JsonObject>): Promise<void> {
    const coords = (ev.payload as any).coordinates;
    const deviceId = ev.action.device.id;

    if (coords?.column === 4 && coords?.row === 2) {
      // Passing undefined as the profile name will switch back to the previous profile
      await streamDeck.profiles.switchToProfile(deviceId, undefined);
    }
  }
}