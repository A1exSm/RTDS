#!/bin/bash

# Create the named pipe (FIFO)
PIPE_PATH="/tmp/pipe_1"
# Remove old pipe if it exists, then create fresh
rm -f $PIPE_PATH
mkdir -p tmp
mkfifo $PIPE_PATH
cd tmp
ls -l
cd ../

echo "Named pipe created at $PIPE_PATH"


# Start the C++ receiver in the background
echo "Starting C++ receiver..."
exec /app/cpp_receiver