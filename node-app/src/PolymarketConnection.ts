import {Connection, PolymarketConfig} from "./Connection";
import WebSocket from "ws";
import {Logger, tick, cross} from "./Logger";
import {MessageDispatcher} from "./MessageDispatcher";
import {MessageReceiver} from "./MessageReceiver";
import {Message} from "./interfaces";
import {Writer} from "./Writer";
/**
 * Manages the persistent WebSocket connection to the Polymarket Data API.
 * Handles lifecycle events (connect, disconnect, reconnect),
 * message dispatching, and piping data to the C++ backend.
 */
class PolymarketConnection extends Connection {
    private ws: WebSocket | null = null;
    private reconnectCount = 0;
    private pingInterval: NodeJS.Timeout | null = null;
    // Sub-modules for separation of concerns
    private messageManager: MessageDispatcher;
    private messageReceiver: MessageReceiver;
    private readonly pipeWriter: Writer;

    constructor() {
        super();
        // Graceful shutdown handling
        process.on("SIGINT", () => this.gracefulShutdown());
        process.on("SIGTERM", () => this.gracefulShutdown());
        // Emitter handling | Messaging
        this.on("message", (data: string)=> this.messageReceiver.receiveMessage(data)); // Incoming WS message -> Receiver -> Logger -> Writer
        // Emitter handling | Connection
        this.on("connected", () => {
            Logger.logMessage(`${tick} Connected to ${PolymarketConfig.dataSource}`);
            Logger.initialize();
            this.subscribe();
        });
        this.on("disconnected", () => {
            Logger.logMessage(`${cross} Disconnected from ${PolymarketConfig.dataSource}`);
            if (!this.isConnected) {
                this.attemptReconnect();
            }
        });
        // Emitter handling | messageManager initialization
        this.messageManager = new MessageDispatcher();
        this.messageManager.on("error", (err: Error) => Logger.error("[MessageDispatcher]", err));
        this.on("info", (info: string) => Logger.info("[MessageDispatcher]", info));
        // Emitter handling | messageReceiver initialization
        this.messageReceiver = new MessageReceiver();
        this.messageReceiver.on("warn", (message: string) => Logger.warn(message));
        this.messageReceiver.on("error", (err: Error) => Logger.error("[MessageReceiver]", err));
        this.messageReceiver.on("message", (message: Message) => Logger.message(message, this.pipeWriter));
        // pipeWriter initialization
        this.pipeWriter = new Writer("/tmp/pipe_1");
    }
    /**
     * Handles clean teardown of connections and file handles.
     * Ensures the named pipe is closed properly to prevent zombie processes.
     */
    private gracefulShutdown(): void {
        Logger.info("gracefulShutdown() called");  // ← Add this
        const forceShutdownTimeout = setTimeout(() => {
            Logger.warn("Forced shutdown due to timeout.");
            this.finishShutdown();
        }, 5000);
        if (this.isConnected && this.ws) {
            Logger.info("WebSocket is connected, waiting for close event...");  // ← Add this
            this.ws.once("close", (code, reason) => {
                Logger. info(`WebSocket closed with code: ${code}, reason: ${reason}`);  // ← Add this
                clearTimeout(forceShutdownTimeout);
                this.finishShutdown();
            });
            this.disconnect();
        } else {
            Logger.info("WebSocket not connected, finishing shutdown immediately");  // ← Add this
            clearTimeout(forceShutdownTimeout);
            this.finishShutdown();
        }
    }

    private finishShutdown(): void {
        this.pipeWriter.close();
        Logger.logMetrics();
        Logger.info("Shutdown complete.");
        process.exit(0);
    }
    /**
     * Establishes the WebSocket connection and sets up event listeners.
     */
    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                Logger.info("Connection to", PolymarketConfig.wsURL);

                this.ws = new WebSocket(PolymarketConfig.wsURL);

                this.ws.on("open", ()=>{
                    this.isConnected = true;
                    this.reconnectCount = 0;
                    Logger.info(`Connecting to ${PolymarketConfig.dataSource}`)
                    this.startPingInterval();
                    this.emit("connected");
                    resolve();
                });

                this.ws.on("close", () => {
                    this.isConnected = false;
                    if (this.pingInterval) {
                        clearInterval(this.pingInterval);
                    }
                    this.emit("disconnected");
                });

                this.ws.on("message", (data: any) => {
                    this.emit("message", data.toString());
                });

                this.ws.on("error", (err: Error) => {
                    Logger.error("WebSocket error:", err);
                    reject(err);
                });
                // Heartbeat Logic
                this.ws.on("ping", () => {
                    try {
                        Logger.inPing();
                        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                            this.ws.pong();
                            Logger.outPong();
                        }
                    } catch (error) {
                        Logger.error("Failed to send pong:", error);
                    }
                });

                this.ws.on("pong", () => Logger.inPong());
            } catch(error) {
                Logger.error("Connection Failed:", error);
                reject(error);
            }
        });
    }
    /**
     * Closes the active WebSocket connection.
     */
    disconnect(): void {
        Logger.info(`Disconnecting from ${PolymarketConfig.dataSource}...`);
        this.isConnected = false;
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.close(1000, "Client Disconnect");
            return;
        }
        this.emit("disconnected");
    }
    /**
     * Maintains connection health by sending periodic pings.
     */
    private startPingInterval(): void {
        this.pingInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                try {
                    this.ws.ping();
                    Logger.outPing();
                } catch (error) {
                    Logger.error("Failed to send ping:", error);
                }
            }
        }, PolymarketConfig.pingInterval);
    }
    /**
     * Exponential Backoff strategy for reconnection.
     * Prevents thundering herd problem on API outages.
     */
    private async attemptReconnect(): Promise<void> {
        if (this.reconnectCount >= PolymarketConfig.maxRetries) {
            Logger.error(`Max reconnect attempts reached (${PolymarketConfig.maxRetries}) for ${PolymarketConfig.dataSource}.`);
            this.emit("Connection Failed");
            return;
        }

        this.reconnectCount++;
        const backoffDelay = PolymarketConfig.reconnectInterval * Math.pow(2, this.reconnectCount);
        Logger.info(`Reconnecting in ${backoffDelay}ms (attempt ${this.reconnectCount}/${PolymarketConfig.maxRetries}) for ${PolymarketConfig.dataSource}.`);

        await this.delay(backoffDelay);

        try {
            await this.connect()
        } catch (error) {
            await this.attemptReconnect()
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Subscribes to relevant market data topics.
     */
    private subscribe(): void {
        if (!this.isConnected) {
            Logger.error("Cannot subscribe: not connected.");
            return;
        }
        this.messageManager.subscribeToActivities(this.ws);
    }
}

export {PolymarketConnection};