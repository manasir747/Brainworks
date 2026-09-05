# Brainworks – Hardware Architecture

## Overview

Brainworks is an infrastructure-independent collision warning and situational awareness system designed for mining environments with poor visibility, hazardous operating conditions, and unreliable communication infrastructure.

The prototype uses:

- ESP32 as the main controller
- LoRa SX1278 / Ra-02 for long-range vehicle-to-vehicle communication
- NEO-6M GPS for vehicle positioning
- 24 GHz mmWave radar for obstacle detection
- Active buzzer for immediate collision alerts

### 1. Cooperative Awareness

Vehicles equipped with Brainworks share their position and identity through GPS and LoRa communication.

### 2. Non-Cooperative Detection

The mmWave radar detects nearby obstacles that cannot transmit location information.

## Hardware Components

## System Architecture

## Communication Flow

## Sensor Fusion Strategy

## Pin Connections

## Power Architecture

## Collision Detection Logic

## Hardware Prototype

## Bill of Materials

## Future Hardware Improvements
