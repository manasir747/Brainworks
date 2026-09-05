# ESP32 Mine Vehicle Safety Node (BRAINWORKS Prototype)

This repository contains the prototype ESP32 firmware for the BRAINWORKS mine safety network. It acts as the physical hardware counterpart to the Brainworks web simulation, maintaining a strictly synchronized architectural logic.

## IMPORTANT SAFETY WARNING
**THIS IS A HACKATHON PROTOTYPE REFERENCE IMPLEMENTATION.**
The brake outputs and motor controls are meant for small-scale prototype demonstration only. **DO NOT** connect this prototype to a real mining haul truck's braking system.

## Relationship to Brainworks Simulator
This codebase precisely mirrors the safety concepts used in the web simulation:
- **Vehicle Position:** Handled via GPS (`TinyGPSPlus`), mirroring the tick-based simulation physics loop.
- **LoRa V2X:** Exchanges `[ID,TYPE,LAT,LON,SPEED,HEADING]` packets in real-time, mirroring the simulation's network overlay.
- **Dynamic Hazards:** Listens for `HAZARD,ROCKFALL,LAT,LON,RADIUS` packets, allowing real-world dynamic rockfalls.
- **Navigation Independence:** Just like the web simulator, **safety detection never modifies the vehicle's heading/navigation.** If radar detects an obstacle or LoRa fails, the vehicle strictly applies Autonomous Emergency Braking (AEB) while remaining aligned with its course. 

## Hardware Assumed
- ESP32 Development Board
- SX1278/SX1276 LoRa transceiver
- NEO-6M GPS Module
- HC-SR04 Ultrasonic Sensor (acting as a prototype forward radar)
- Buzzer
- Relay/Motor Driver (for brake and motor enable)

## Default Pin Mapping
*Note: Configurable at the top of `src/main.cpp`.*
- **LoRa SPI:** SCK=18, MISO=19, MOSI=23, SS=5, RST=14, DIO0=26
- **GPS Serial:** RX=16, TX=17
- **Radar:** TRIG=32, ECHO=33
- **Output:** Buzzer=25, Brake=27, Motor=4

## Safety Thresholds
- **Radar Brake:** 58m
- **Remote Hazard Brake:** 58m
- **V2V Emergency:** 65m
- **V2X Pre-warning:** 75m - 190m

## Serial Commands
Use the Arduino IDE or PlatformIO Serial Monitor (115200 baud) to run tests:
- `STATUS`: Prints full vehicle telemetry, nearby hazards, TTC, and AEB status.
- `TEST_BEEP`: Triggers a test buzzer sequence.
- `TEST_AEB`: Temporarily activates the emergency brake output.
- `LORA_FAIL`: Simulates a communication breakdown. Navigation will *not* change.
- `LORA_RECOVER`: Restores LoRa connectivity.
- `ROCKFALL`: Drops a simulated rockfall hazard at the current GPS location.
- `CLEAR_HAZARDS`: Flushes the hazard array.
