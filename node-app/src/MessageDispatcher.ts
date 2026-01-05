import {EventEmitter} from "events";
import WebSocket from "ws";
import {Subscription, SubscriptionMessage, SubscriptionAction} from "./interfaces";

/**
 * MessageDispatcher class is responsible for managing subscription messages sent over a WebSocket connection.
 * It extends EventEmitter to provide event-driven communication for logging and error handling.
 */
export class MessageDispatcher extends EventEmitter {
    // Default subscription configurations
    private static readonly cryptoSubscription: Subscription = {
        topic: "crypto_prices",
        type: "update",
    }
    private static readonly activitySubscription: Subscription = {
        topic: "activity",
        type: "trades",
    }
    /**
     * Sends a JSON subscription payload to the WebSocket server.
     * @param ws Active WebSocket connection
     * @param subscriptions List of subscription objects to send
     */
    private sendSubscriptionMessage(ws: WebSocket | null, ...subscriptions: Subscription[]): void {
        try {
            // Check if WebSocket is open or Initialised
            if (ws == null || ws.readyState !== WebSocket.OPEN) {
                if (ws===null) {
                    this.emit("error", new Error("WebSocket is null."));
                    return
                }
                this.emit("error", new Error("WebSocket is not open."));
            }
            // Create subscription message
            const subscriptionMessage: SubscriptionMessage = {
                action: SubscriptionAction.SUBSCRIBE,
                subscriptions: [],
            };
            while (subscriptions.length > 0) {
                subscriptionMessage.subscriptions.push(<Subscription>subscriptions.pop());
            }
            // Send subscription message
            let message: string = JSON.stringify(subscriptionMessage);
            this.emit("info", `Sending subscription message: ${message}`);
            ws.send(message)
            this.emit("info", "Subscription message sent.");
        } catch (error) {
            this.emit("error", error);
        }
    }
    /**
     * Subscribe to both crypto prices and activity trades.
     * @param ws The WebSocket connection to send the subscription message through.
     */
    public subscribeBoth(ws: WebSocket | null): void {
        this.sendSubscriptionMessage(ws, MessageDispatcher.cryptoSubscription, MessageDispatcher.activitySubscription);
    }
    /**
     * Subscribe to activity trades.
     * @param ws The WebSocket connection to send the subscription message through.
     */
    public subscribeToActivities(ws: WebSocket | null): void {
        this.sendSubscriptionMessage(ws, MessageDispatcher.activitySubscription);
    }
    /**
     * Subscribe to crypto prices.
     * @param ws The WebSocket connection to send the subscription message through.
     */
    public subscribeToCryptos(ws: WebSocket | null): void {
        this.sendSubscriptionMessage(ws, MessageDispatcher.cryptoSubscription);
    }
}