# RTDS: Real-Time Market Anomaly Detection System

RTDS is a high-performance, multi-threaded C++ engine designed to detect suspicious trading activity (Insider Trading, Whale Accumulation) on prediction markets in real-time.

It uses a producer-consumer architecture to ingest live WebSocket data via Node.js, passing it through Unix named pipes to a C++ analysis engine that performs O(1) statistical anomaly detection using Exponential Moving Averages (EMA).

## Architecture

*   **Ingestion Layer (Node.js/TypeScript):** Connects to the Polymarket WebSocket API, handles reconnection logic, and normalizes data streams.
*   **Transport Layer (Unix Pipes):** Zero-latency Inter-Process Communication (IPC) transferring raw JSON payloads between containers.
*   **Analysis Engine (C++):**
    *   **Thread Pool:** A fixed-size worker pool prevents resource exhaustion.
    *   **Lock-Free Queues:** Thread-safe job queues separate ingestion from analysis.
    *   **Fine-Grained Locking:** Per-asset mutexes allow parallel processing of different market tickers.
    *   **Statistical Logic:** Implements Welford’s Algorithm and EMA to detect 5-sigma volume anomalies and price volatility.

## Prerequisites

*   [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

## How to Run

1.  **Clone the repository**
    ```bash
    git clone https://github.com/A1exSm/RTDS.git
    cd RTDS
    ```

2.  **Build the containers**
    This compiles the C++ engine (GCC) and builds the TypeScript worker.
    ```bash
    docker compose build
    ```

3.  **Start the System**
    ```bash
    docker compose up
    ```

4.  **View the Logs**
    You will see real-time alerts in the console:
    ```text
    [Whale Accumulation] :: Bitcoin Up or Down
       Price: 0.57 (Avg: 0.5703)
       Size:  10000 (Avg: 1011.45)
    ```

## Detection Logic

The system flags trades based on a multi-factor analysis:

1.  **Volume Threshold:** Is the trade size > 5x the moving average?
2.  **Price Volatility:** Did the price shift > 50% relative to the moving average?
3.  **Noise Filtering:** Ignores "dust" trades (< 100 units) to maintain statistical relevance.
4.  **Adaptive Baseline:** Uses `Alpha=0.01` EMA to adapt to market conditions over time.

## Project Structure

*   `cpp-app/`: The C++ source code for the detection engine.
*   `node-app/`: The TypeScript source for WebSocket ingestion.
*   `docker-compose.yaml`: Orchestration configuration.
*   `start.sh`: Script to initialize named pipes within the container environment.