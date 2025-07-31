// src/actions/back.ts
import streamDeck, { action, KeyDownEvent, SingletonAction } from "@elgato/streamdeck";

// match the same in-memory store if you ever need it,
// but here we’re doing a hard-coded back to "Default".
type NoSettings = {};

@action({ UUID: "com.aurum.rust-deck.back" })
export class Back extends SingletonAction<NoSettings> {
  override onKeyDown(ev: KeyDownEvent<NoSettings>): void {
    // hard-coded “go back to Default”
    streamDeck.profiles.switchToProfile(ev.action.device.id, "Default");
  }
}
