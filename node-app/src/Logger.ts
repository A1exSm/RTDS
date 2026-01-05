import {Message, Metrics} from "./interfaces";
import {Writer} from "./Writer";
// Unicode characters
let cross = '\u{2717}';
let tick = '\u{2713}';
/**
 * Centralized logging and metrics collection.
 * Responsible for formatting messages and routing valid data to the Writer pipeline.
 */
class Logger {
    private static metric : Metrics = {
        messagesReceived: 0,
        pingsReceived: 0,
        pongsReceived: 0,
        pingsSent: 0,
        pongsSent: 0,
        errorsReceived: 0,
        warningsReceived: 0,
        infosReceived: 0,
        debugsReceived: 0,
        logMessagesReceived: 0,
    }
    private static startTime: Date = new Date(); // Initialized at class load time
    // Text
    private static readonly ti: string = "|-------------------- Logger Metrics --------------------|"; // Title
    private static readonly en: string = "|------------------------- END --------------------------|"; // End
    private static readonly br: string = "|--------------------------------------------------------|"; // Break
    // Colours
    private static readonly reset = "\x1b[0m";
    private static readonly cyan = "\x1b[36m";
    private static readonly grey = "\x1b[90m";
    private static readonly red = "\x1b[31m";
    private static readonly yellow= "\x1b[33m";
    private static readonly magenta = "\x1b[35m";
    private static readonly blue = "\x1b[34m";
    private static readonly green = "\x1b[36m";
    /** Initialize the Logger's start time */
    public static initialize(): void {
        this.startTime = new Date();
    }
    private static getUptime(): string {
        if (!this.startTime) {
            return "Cannot get uptime. Logger not initialized.";
        }
        let now = new Date();
        let diff = now.getTime() - this.startTime.getTime();
        let microseconds = Math.floor((diff * 1000) % 1000);
        let milliseconds = Math.floor((diff) % 1000);
        let seconds = Math.floor((diff / 1000) % 60);
        let minutes = Math.floor((diff / (1000 * 60)) % 60);
        let hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        let days = Math.floor(diff / (1000 * 60 * 60 * 24));
        return `${days}d ${hours}h ${minutes}m ${seconds}s ${milliseconds}ms ${microseconds}µs`;
    }
    /** Log a debug message */
    static debug(message: string, data?: any): void {
        this.metric.debugsReceived++;
        console.debug(`${Logger.cyan}[DEBUG] [${new Date().toUTCString()}]${Logger.reset} ${message}`, data || '');
    }
    /** Log an info message */
    static info(message: string, data?: any): void {
        this.metric.infosReceived++;
        console.log(`${Logger.grey}[INFO] [${new Date().toUTCString()}]${Logger.reset} ${message}`, data || '');
    }
    /** Log a warning message */
    static warn(message: string, data?: any): void {
        this.metric.warningsReceived++;
        console.warn(`${Logger.yellow}[WARN] [${new Date().toUTCString()}]${Logger.reset} ${message}`, data || '');
    }
    /** Log an error message */
    static error(message: string, data?: any): void {
        this.metric.errorsReceived++;
        console.error(`${Logger.red}[ERROR] [${new Date().toUTCString()}]${Logger.reset} ${message}`, data || '');
    }
    /**
     * Logs a received message and writes it to the provided pipeline.
     * @param data A message received from the WebSocket
     * @param pipeline The pipeline {@link Writer} to send the message through
     */
    static message(data: Message, pipeline: Writer): void {
        this.metric.messagesReceived++;
        pipeline.write(data);
    }
    /** Log a general log message */
    static logMessage(message: string): void {
        this.metric.logMessagesReceived++;
        console.log(`${Logger.magenta}${message}${Logger.reset}`);
    }
    /** Log incoming ping */
    static inPing() {
        this.metric.pingsReceived++;
        console.debug(`${Logger.green}\u{2039}\u{2039} PING \u{2039}\u{2039}${Logger.reset}`)
    }
    /** Log outgoing ping */
    static outPing() {
        this.metric.pingsSent++;
        console.debug(`${Logger.green}\u{203A}\u{203A} PING \u{203A}\u{203A}${Logger.reset}`)
    }
    /** Log incoming pong */
    static inPong() {
        this.metric.pongsReceived++;
        console.debug(`${Logger.blue}\u{2039}\u{2039} PONG \u{2039}\u{2039}${Logger.reset}`)
    }
    /** Log outgoing pong */
    static outPong() {
        this.metric.pongsSent++;
        console.debug(`${Logger.blue}\u{203A}\u{203A} PONG \u{203A}\u{203A}${Logger.reset}`)
    }
    /** Log the current metrics */
    static logMetrics(): void {
        let totalMessages = 0;
        for (const value of Object.entries(this.metric).values()) {
            totalMessages += value[1];
        }
        console.log(`${Logger.br}\n${Logger.ti}\n${Logger.br}`);
        this.printStat(`Messages Received ${this.metric.messagesReceived}`);
        this.printStat(`Pings Received ${this.metric.pingsReceived}`);
        this.printStat(`Pongs Received ${this.metric.pongsReceived}`);
        this.printStat(`Pings Sent ${this.metric.pingsSent}`);
        this.printStat(`Pongs Sent ${this.metric.pongsSent}`);
        this.printStat(`Errors Received ${this.metric.errorsReceived}`);
        this.printStat(`Warnings Received ${this.metric.warningsReceived}`);
        this.printStat(`Infos Received ${this.metric.infosReceived}`);
        this.printStat(`Debugs Received ${this.metric.debugsReceived}`);
        this.printStat(`Log Messages Received ${this.metric.logMessagesReceived}`);
        console.log(Logger.br);
        this.printStat(`Uptime ${this.getUptime()}`);
        this.printStat(`Total Messages Processed ${totalMessages}`);
        console.log(`${Logger.br}\n${Logger.en}\n${Logger.br}`);
    }
    private static printStat(message: string): void {
        const size: number = 57;
        const padding: number = 2;
        if (message.length -1 > size - padding) {
            console.error(`Message too long to print in stats: ${message}`);
            return;
        }
        const messageSize: number = padding + message.length-1;
        const spaces: string = ' '.repeat((size - messageSize)-2);
        console.log(`| ${message}${spaces} |`);
    }
}
export { tick, cross, Logger};