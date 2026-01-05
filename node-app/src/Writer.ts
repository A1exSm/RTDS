import {createWriteStream, WriteStream} from "node:fs";
import {Logger} from "./Logger";
import {isActivity, isCrypto, Message, Symbols} from "./interfaces";
/**
 * Handles Inter-Process Communication (IPC) by writing to a Unix Named Pipe (FIFO).
 * This acts as the bridge between the Node.js ingestion layer and the C++ analysis engine.
 */
class Writer {
    private stream: WriteStream;
    /**
     * Opens a write stream to the specified file path (Pipe).
     * @param filePath Path to the named pipe (e.g., /tmp/pipe_1)
     */
    constructor(filePath: string) {
        // Monitoring stream health
        this.stream = createWriteStream(filePath);
        this.stream.on('open', (fd) => Logger.info('Stream opened with file descriptor:', fd));
        this.stream.on('close', () => Logger.info('Stream closed'));
        this.stream.on('error', (err:Error) => Logger.error('Stream Error:', err));
        this.stream.on('finish', () => Logger.info('Stream Finish, all writes are complete'));
        this.stream.on('drain', () => Logger.info('Buffer drained, ready for more data'));
        this.stream.on('pipe', (src) => Logger.info('Piping data from source:', src));
        this.stream.on('unpipe', (src) => Logger.info('A readable stream was unpiped from this writable:', src));
    }
    /**
     * Write a message to the stream and currently only supports Activity payloads.
     * The payload sent to the stream is formatted as:
     * {title}{name}{outcome}{outcomeIndex}{side}{size}{price}{timestamp}, the contents may be changes,
     * if the program reading the other end of the pipe is also changed accordingly.
     * @param data A message received from the WebSocket
     */
    public write(data: Message): void {
        if (!isActivity(data.payload) && !isCrypto(data.payload)) {
            Logger.error("Received message with unknown payload type.", data.payload);
            return
        }
        let payloadTime = new Date(data.payload.timestamp*1000).toLocaleTimeString(); // Convert to milliseconds
        if (isActivity(data.payload)) {
            let payload = data.payload;
            this.stream.write(this.stringBuilder([payload.title,payload.name, payload.outcome,payload.outcomeIndex,payload.side,payload.size,payload.price,payloadTime]));
        } else if (isCrypto(data.payload)) {
            Logger.error("This program is not made for CPT payloads.", data.payload);
        }
    }
    /**
     * Close the write stream.
     */
    public close(): void {
        this.stream.close();
    }
    private stringBuilder(items: (Symbols | number | string)[]) : string {
        let data : string = "";
        for (let item of items) {
            data += "{" + item + "}";
        }
        return data + "\n";
    }
}
export { Writer };