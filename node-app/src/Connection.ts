import {EventEmitter} from "events";
import {config} from "./interfaces";

class PolymarketConfig {
    static dataSource: string = "polymarket"
    static wsURL: string = "wss://ws-live-data.polymarket.com"
    static pingInterval: number = 5000
    static reconnectInterval: number = 2000
    static maxRetries: number = 5
    static config(): config {
        return {
            dataSource: this.dataSource,
            wsURL: this.wsURL,
            pingInterval: this.pingInterval,
            reconnectInterval: this.reconnectInterval,
            maxRetries: this.maxRetries,
        };
    }
}

abstract class Connection extends EventEmitter {
    protected isConnected: boolean = false;
    async connect(): Promise<void> {}
    disconnect(): void {}
}

async function run(stream: Connection) {
    await stream.connect();
}

export {Connection, PolymarketConfig, run};