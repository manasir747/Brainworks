# BRAINWORKS - Mine Vehicle Safety Simulation

An interactive, real-time web-based simulation demonstrating a safety-support system for mining haul trucks operating in open-cast mines under fog, dust, blind corners, and unreliable connectivity. 

> **Note:** This is a demonstration and conceptual simulator of the proposed V2X and local radar safety architecture, designed for rapid testing of autonomous emergency braking (AEB) and mesh telemetry logic.

## 🚀 Key Features

### 1. Dynamic Fleet & Hazard Management
- **Dynamic Fleet Deployment:** Spawn multiple haul trucks, water tankers, and safety rovers dynamically into the active simulation. Vehicles safely merge onto the haul roads, taking into account traffic clearance.
- **Dynamic Hazards:** Drop rockfalls and obstacles anywhere on the road network in real-time. The simulation automatically enforces that hazards are dropped within road boundaries and away from immediate collisions.

### 2. Autonomous Emergency Braking (AEB) & TTC
- **V2V (Vehicle-to-Vehicle) Collisions:** Uses Time-to-Collision (TTC) calculations based on relative speeds and distances to autonomously trigger braking before rear-end or head-on collisions.
- **Local Radar (LiDAR) Simulation:** Each vehicle is equipped with a forward-facing 45-degree radar cone. Upon detecting a hazard, it draws a targeted visual indicator and triggers immediate AEB, completely preventing the truck from veering off-route.
- **Predictive Stopping Hysteresis:** Traffic naturally queues at a safe distance behind stopped vehicles and smoothly resumes once the hazard clears.

### 3. V2X Mesh Networking & Scenarios
- **LoRa Failure Scenario:** Simulates a catastrophic V2X communication failure where trucks revert exclusively to local radar to avoid head-on collisions.
- **Blind Corner & Rockfall:** Pre-built scenarios to validate safety logic in highly dangerous, low-visibility mining environments.

### 4. Professional Industrial Alerts
- Features a clean, fixed-pitch (900 Hz) dashboard buzzer using the native Web Audio API. 
- The alert pattern intelligently coordinates across the entire fleet to prevent overlapping audio, ensuring a realistic, non-intrusive safety warning system.

## 🛠️ Technology Stack

- **Framework:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS (Dark industrial theme)
- **Animations:** Framer Motion (for UI panels)
- **Map & Physics:** 2D Math, Splines, and HTML Canvas/SVG
- **Audio:** Web Audio API

## 🚦 Getting Started

### Prerequisites
Make sure you have Node.js (v16+) installed.

### Installation
1. Clone the repository and navigate to the simulation source code folder:
   ```bash
   cd "Hardware/Simulation Source Code"
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Simulator
Start the development server:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173/` (or the port specified by Vite).

## 📁 Architecture Overview
- `src/hooks/useSimulation.ts`: The central physics and state engine. This handles the high-frequency tick loop, route spline interpolation, AEB logic, V2X calculations, and dynamic spawning. Safety logic strictly modifies vehicle *speed* and never corrupts the predefined navigation heading.
- `src/components/MineMap.tsx`: The primary visualizer. Renders the SVG roads, vehicle bodies, radar cones, hazard indicators, and V2X mesh communication links.
- `src/App.tsx`: The main UI dashboard containing the simulation controls, dynamic fleet manager, and telemetry inspector.
