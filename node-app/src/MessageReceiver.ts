import {Message} from "./interfaces";
import {EventEmitter} from "events";

export class MessageReceiver extends EventEmitter{
    receiveMessage(rawMessage: string): void {
        if (!rawMessage) {
            this.emit("warn", "Received empty message.");
            return;
        }
        let failed: boolean = false;
        try {
            let message: Message = JSON.parse(rawMessage);
            if (!message.payload) {
                this.emit("error", new Error("Received message without payload."));
                failed = true;
            }
            if (!message.type) {
                this.emit("error", new Error("Received message without type."));
                failed = true;
            }
            if (message.type != "trades" && message.type != "update") {
                this.emit("error", new Error(`Unknown message type: ${message.type}`));
                failed = true;
            }
            if (failed) return;
            this.emit("message", message);
        } catch (error) {
            this.emit("error", error);
        }
    }
}