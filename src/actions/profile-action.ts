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
  /**
   * Checks if the button is in the bottom-right position for any Stream Deck size
   */
  private isBottomRightButton(coords: any, device: any): boolean {
    if (!coords || !device) return false;
    
    // Get device dimensions
    const { columns, rows } = device.size;
    
    // Check if this is the bottom-right button (last column, last row)
    // Note: coordinates are 0-indexed
    return coords.column === columns - 1 && coords.row === rows - 1;
  }

  override async onWillAppear(ev: WillAppearEvent<JsonObject>): Promise<void> {
    const coords = (ev.payload as any).coordinates;
    const device = ev.action.device;

    if (this.isBottomRightButton(coords, device)) {
      await ev.action.setTitle("Back");
    }
  }

  override async onKeyDown(ev: KeyDownEvent<JsonObject>): Promise<void> {
    const coords = (ev.payload as any).coordinates;
    const device = ev.action.device;
    const deviceId = device.id;

    if (this.isBottomRightButton(coords, device)) {
      // Passing undefined as the profile name will switch back to the previous profile
      await streamDeck.profiles.switchToProfile(deviceId, undefined);
    }
  }
}