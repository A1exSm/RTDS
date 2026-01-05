FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y g++ dos2unix && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy all C++ source files
COPY cpp-app/*.h cpp-app/*.cpp ./cpp-app/


# Copy the startup script
COPY start.sh . 

# Convert line endings and make executable
RUN dos2unix start.sh && chmod +x start.sh

# Compile
RUN g++ -pthread -o /app/cpp_receiver cpp-app/main.cpp

# Use start.sh to create pipe and run app
CMD ["/app/start.sh"]