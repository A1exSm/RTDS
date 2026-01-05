/**
 * Although no alternative data sources are currently supported,
 * the config interface is defined to allow for future extensibility.
 */
interface config {
    dataSource: string;
    wsURL: string;
    pingInterval: number;
    reconnectInterval: number;
    maxRetries: number;
}
/**
 * Subscription interface represents the structure of individual subscriptions within a subscription message.
 */
interface Subscription {
    topic: string;
    type: string;
    filters?: string;
}
/**
 * SubscriptionMessage interface represents the structure of subscription messages sent to the WebSocket server.
 */
interface SubscriptionMessage {
    action: SubscriptionAction;
    subscriptions: Subscription[];
}
/**
 * Unused CryptoPayload interface, although not currently utilized, it is defined for potential future use.
 * It represents the structure of cryptocurrency price update messages.
 */
interface CryptoPayload {
    full_accuracy_value: number;
    symbol: Symbols;
    timestamp: number;
    value: number;
}
/**
 * ActivityPayload interface represents the structure of activity trade messages.
 */
interface ActivityPayload {
    asset: number;
    bio: string;
    conditionId: string;
    eventSlug: string;
    icon: string;
    name: string;
    outcome: string;
    outcomeIndex: number;
    price: number;
    profileImage: string;
    proxyWallet: string;
    pseudonym: string;
    side: "BUY" | "SELL";
    size: number;
    slug: string;
    timestamp: number;
    title: string;
    transactionHash: string;
}
/**
 * Message interface represents the overall structure of messages received from the WebSocket server.
 */
interface Message {
    connection_id: string;
    payload: ActivityPayload | CryptoPayload;
    timestamp: number;
    topic: string;
    type: string;
}
/**
 * Metrics interface represents the structure for tracking various metrics related to message processing.
 * Utilised by {@link Logger}.
 */
interface Metrics {
    messagesReceived: number;
    pingsReceived: number;
    pongsReceived: number;
    pingsSent: number;
    pongsSent: number;
    errorsReceived: number;
    warningsReceived: number;
    infosReceived: number;
    debugsReceived: number;
    logMessagesReceived: number;
}
/**
 * Symbols enum represents the supported cryptocurrency trading pairs.
 * Not currently utilised due to the program's focus on activity trades.
 */
enum Symbols {
    BTC = "btcusdt",
    ETH = "ethusdt",
    SOL = "solusdt",
    XPR = "xprusdt",
}
/**
 * SubscriptionAction enum represents the possible actions for subscription messages.
 */
enum SubscriptionAction {
    SUBSCRIBE = "subscribe",
    UNSUBSCRIBE = "unsubscribe",
}
// Type Guards
function isActivity(payload: any): payload is ActivityPayload {
    return payload.asset !== undefined;
}
function isCrypto(payload: any): payload is CryptoPayload {
    return payload.symbol !== undefined;
}
export { config, Subscription, SubscriptionMessage, SubscriptionAction, Message, CryptoPayload, ActivityPayload, Symbols, Metrics, isActivity, isCrypto};