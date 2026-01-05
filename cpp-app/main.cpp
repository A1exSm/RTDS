#include <iostream>
#include <fstream>
#include <mutex>
#include <atomic>
#include <queue>
#include <thread>
#include <string>
#include <stack>
#include <csignal>
#include <unordered_map>
#include "Prediction.h"
#include "PredData.h"
#include "JobQueue.h"

using namespace std;
// Job Queues
JobQueue<string> parse_jobs;
JobQueue<Prediction> analysis_jobs;
// Tracks if the program is to be running.
atomic<bool> running{true};
// Worker Pool
vector<thread> worker_pool;
constexpr int num_jobs = 3;
// Data structure to hold prediction data and its mutex guard.
mutex map_lock;
unordered_map<string, PredData> pred_data;

// Print coloured text to the console
void printColour(const string &colour, const string &text) {
    cout << colour << text << "\x1b[0m";
}

// The parsing function for received data called by parse_job worker threads.
void parse(const string &line) {
    bool find_start = true;
    vector<string> values;
    int count = 0;
    for (const char &c: line) {
        if ((c == '{' && !find_start) || (c == '}' && find_start)) {
            cout << "[Warning] found incorrect brace when parsing: " << line << "\n";
            return;
        }
        if (c == '{') {
            find_start = false;
            values.emplace_back("");
            continue;
        }
        if (c == '}') {
            find_start = true;
            count++;
            continue;
        }
        if (!find_start) {
            values[count] += c;
        }
    }
    if (values.empty()) {
        cerr << "[Warning] No values found in: " << line << endl;
        return;
    }
    try {
        if (values.size() < 8) {
            throw invalid_argument("Expected 8 values but found " + to_string(values.size()));
        }
        const string &title = values[0];
        const string &name = values[1];
        const string &outcome = values[2];
        const int &outcome_value = stoi(values[3]);
        const string &side = values[4];
        const int &size = stoi(values[5]);
        const float &price = stof(values[6]);
        const string &timestamp = values[7];
        const Prediction prediction(title, name, outcome, outcome_value, side, size, price, timestamp);
        analysis_jobs.push(prediction);
    } catch (const invalid_argument &e) {
        cerr << string(e.what()) << "\n" << "Invalid input: " << line << endl;;
    }
}
// The analysis function for analysis jobs called by in analysis worker threads.
void analysePrediction(const Prediction &pred) {
    PredData* data_ptr = nullptr;
    {
        lock_guard guard(map_lock);
        data_ptr = &pred_data[pred.title];
    }
    string alert_name;
    switch (data_ptr->processPrice(pred.price, pred.size, pred.outcome_value)) {
        case AlerterType::PriceSpike:
            alert_name = "Price Spike";
            break;
        case AlerterType::WhaleAccumulation:
            alert_name = "Whale Accumulation";
            break;
        case AlerterType::Combined:
            alert_name = "Combined Alert";
            break;
        case AlerterType::None:
            return;
    }
    const float avg_p = (pred.outcome_value == 1)
        ? data_ptr->getSecondPriceAverage()
        : data_ptr->getFirstPriceAverage();
    const float avg_s = (pred.outcome_value == 1)
        ? data_ptr->getSecondSizeAverage()
        : data_ptr->getFirstSizeAverage();
    printColour("\x1b[31m", "[" + alert_name + "] ");
    cout << " :: " << pred.title << "\n";
    cout << "\tSide:  " << pred.side << " \n";
    cout << "\tOutcome: " << pred.outcome << "\n";
    cout << "\tPrice: " << pred.price << " (Avg: " << avg_p << ")\n";
    cout << "\tSize:  " << pred.size  << " (Avg: " << avg_s << ")\n";
    cout << "\tTime:  " << pred.timestamp << "\n";
}
// The parse worker function assigned to worker threads.
void parser_worker() {
    while (true) {
        auto opt = parse_jobs.pop();
        if (!opt) break;
        parse(*opt);
    }
}
// The analysis worker function assigned to worker threads.
void analysis_worker() {
    while (true) {
        auto opt = analysis_jobs.pop();
        if (!opt) break;
        analysePrediction(*opt);
    }
}
// A counter-function that runs in its own thread to track run time.
void counter() {
    int runTime = 0;
    while (running) {
        this_thread::sleep_for(chrono::milliseconds(1000));
        printColour("\x1b[34m", "Run Time: " + to_string(++runTime) + "s\n");
    }
}
// A function called when code is terminated, ensures all threads are joined.
void delThreads() {
    for (auto &t: worker_pool) {
        if (t.joinable()) {
            t.join();
        }
    }
    cout << "All worker threads joined.\n";
}
// Used to handle the correct code needed when terminating.
void gracefulExit(const int signal) {
    if (!running.exchange(false)) return;
    cout << "------------------------\n";
    cout << "Gracefully exiting..." << endl;
    parse_jobs.stop();
    analysis_jobs.stop();
    delThreads();
    // This section below can be commented out, it's just to show final averages on termination.
    cout << "------------------------\n";
    for (const auto &[title, data]: pred_data) {
        cout << title << ": buy? " << data.getFirstPriceAverage() << " sell? " << data.getSecondPriceAverage() << endl;
    }
    cout << "------------------------\n";
    cout << "Exited successfully" << endl;
}

int main() {
    signal(SIGTERM, gracefulExit);
    signal(SIGINT, gracefulExit);
    // Get the number of threads
    const auto num_threads = thread::hardware_concurrency();
    if (num_threads < num_jobs + 1) {
        throw domain_error(
            "Insufficient threads available to run, with minimum being " + to_string(num_jobs + 1) +
            " and assigned being " + to_string(num_threads) + ".\n");
    }
    for (auto i = 0; i < 2; i++) {
        worker_pool.emplace_back(parser_worker);
    }
    for (auto i = 0; i < num_threads - 2; i++) {
        worker_pool.emplace_back(analysis_worker);
    }
    worker_pool.emplace_back(counter);
    // Open pipe for reading
    ifstream pipe("/tmp/pipe_1");
    if (!pipe.is_open()) {
        cerr << "Error opening pipe" << endl;
        return 1;
    }
    // Awaiting data
    string line;
    while (running && getline(pipe, line)) {
        if (line.empty()) continue;
        parse_jobs.push(line);
    }
    // Exit
    gracefulExit(0);
    return 0;
}
