import streamDeck, {
  action,
  type KeyDownEvent,
  SingletonAction,
} from "@elgato/streamdeck";
import type { SingleActionPayload } from "@elgato/streamdeck/types/plugin/events";

type SmartSwitchesSettings = {
  // configured in the property inspector
  fromProfile: string;
  previousProfile?: string;
};

@action({ UUID: "com.aurum.rust-deck.smart-switches" })
export class SmartSwitches extends SingletonAction<SmartSwitchesSettings> {
  override async onKeyDown(
    ev: KeyDownEvent<SmartSwitchesSettings>
  ): Promise<void> {
    // cast to single-action payload
    const payload = ev.payload as SingleActionPayload<
      SmartSwitchesSettings,
      "Keypad"
    >;
    const deviceId = payload.device;

    // read & persist
    const { fromProfile } = payload.settings;
    await ev.action.setSettings({
      ...payload.settings,
      previousProfile: fromProfile,
    });

    // switch into the “Smart Switches” profile
    await streamDeck.profiles.switchToProfile(deviceId, "Smart Switches");
  }
}
