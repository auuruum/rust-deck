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

interface ServerInfoSettings {
    serverUrl: string;
    updateInterval: number;
}

@action({ UUID: "com.aurum.rust-deck.server-info" })
export class ServerInfo extends SingletonAction {
    private updateInterval: NodeJS.Timeout | null = null;
    private currentAction: any = null;
    private settings: ServerInfoSettings = {
        serverUrl: "http://localhost:8080/info",
        updateInterval: 30
    };

    override onWillAppear(ev: any) {
        this.currentAction = ev.action;
        console.log("Server Info button appeared, starting updates...");
        // Start periodic updates when the button appears
        this.updateServerInfo();
        this.startUpdateInterval();
    }

    override onWillDisappear() {
        console.log("Server Info button disappeared, stopping updates...");
        // Clean up interval when button disappears
        this.stopUpdateInterval();
    }

    override onKeyDown(ev: KeyDownEvent) {
        console.log("Server Info button pressed, updating immediately...");
        // Refresh data on button press
        this.updateServerInfo(ev.action);
    }

    override onDidReceiveSettings(ev: any) {
        console.log("Settings received:", ev.payload.settings);
        this.settings = {
            serverUrl: ev.payload.settings.serverUrl || "http://localhost:8080/info",
            updateInterval: parseInt(ev.payload.settings.updateInterval) || 30
        };
        
        // Restart the update interval with new settings
        this.stopUpdateInterval();
        this.startUpdateInterval();
    }

    private startUpdateInterval() {
        console.log(`Starting update interval: ${this.settings.updateInterval} seconds`);
        this.updateInterval = setInterval(() => {
            console.log("Interval update triggered...");
            this.updateServerInfo();
        }, this.settings.updateInterval * 1000);
    }

    private stopUpdateInterval() {
        if (this.updateInterval) {
            console.log("Stopping update interval");
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    private async updateServerInfo(action = this.currentAction) {
        try {
            console.log(`Fetching server info from: ${this.settings.serverUrl}`);
            const response = await fetch(this.settings.serverUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json() as ServerInfoResponse;
            console.log(`Server info received: ${data.players}/${data.max_players} players`);
            
            // Update the button title with player count
            action.setTitle(`${data.players}/${data.max_players}`);
        } catch (error) {
            console.error("Failed to fetch server info:", error);
            action.setTitle("Error");
        }
    }
} 