declare module "ws" {
  export type RawData = Buffer | ArrayBuffer | Buffer[];

  export default class WebSocket {
    static readonly OPEN: number;

    readonly readyState: number;

    constructor(url: string);
    send(data: string): void;
    close(): void;
    on(event: "open", listener: () => void): this;
    on(event: "message", listener: (data: RawData) => void): this;
    on(event: "error", listener: (error: Error) => void): this;
    on(event: "close", listener: () => void): this;
  }
}
