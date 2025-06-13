import { action, KeyDownEvent, SingletonAction } from "@elgato/streamdeck";

export interface ServerInfoResponse {
    url: string;
    name: string;
    map: string;
    size: number;
    players: number;
    max_players: number;
    queued_players: number;
    seed: number;
}

@action({ UUID: "com.aurum.rust-deck.server-info" })
export class ServerInfo extends SingletonAction {
    private updateInterval: NodeJS.Timeout | null = null;
    private currentAction: any = null;

    override onWillAppear(ev: any) {
        this.currentAction = ev.action;
        // Start periodic updates when the button appears
        this.updateServerInfo();
        this.updateInterval = setInterval(() => this.updateServerInfo(), 30000); // Update every 30 seconds
    }

    override onWillDisappear() {
        // Clean up interval when button disappears
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    override onKeyDown(ev: KeyDownEvent) {
        // Refresh data on button press
        this.updateServerInfo(ev.action);
    }

    private async updateServerInfo(action = this.currentAction) {
        try {
            const response = await fetch("http://localhost:8080/info");
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json() as ServerInfoResponse;
            
            // Update the button title with player count
            action.setTitle(`${data.players}/${data.max_players}`);
        } catch (error) {
            console.error("Failed to fetch server info:", error);
            action.setTitle("Error");
        }
    }
} 