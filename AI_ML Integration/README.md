# Brainworks — Edge AI Integration

Brainworks uses Edge AI on the ESP32 to improve the reliability of 24 GHz radar-based obstacle detection. A lightweight TinyML classifier analyzes a short temporal window of radar readings to distinguish persistent physical obstacles from transient environmental noise. The classification is performed locally on the vehicle, enabling low-latency operation without cloud dependency.

**Status: Proposed / Planned Implementation**

```mermaid
flowchart TD
    classDef normal fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef warning fill:#854d0e,stroke:#eab308,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef danger fill:#7f1d1d,stroke:#ef4444,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef ai fill:#3730a3,stroke:#818cf8,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef logic fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#fff,rx:8px,ry:8px;

    R[24 GHz Radar]:::normal --> DATA[Radar Distance + Echo Data]:::normal
    DATA --> ESP32[ESP32 Edge Processing]:::normal
    ESP32 --> RW[Rolling Temporal Window]:::normal
    RW --> TML[TinyML Radar Classifier]:::ai
    
    TML --> CLASS{"Noise or Solid Obstacle?"}:::ai
    
    CLASS -->|0| NOISE[Transient Noise]:::normal
    CLASS -->|1| SOLID[Solid Obstacle]:::warning
    
    NOISE --> CM[Continue Monitoring]:::logic
    
    SOLID --> EVAL[Safety Evaluation]:::warning
    EVAL --> TTC[Distance + TTC]:::warning
    TTC --> DET[Deterministic Safety Logic]:::logic
    
    DET --> SAFE[Safe/Monitor]:::logic
    DET --> HAZ[Hazard]:::danger
    
    HAZ --> WARN[Local Warning / Buzzer]:::danger
    WARN --> AEB[AEB / Brake Output]:::danger
```

## How It Works

- **Input:** 24 GHz radar provides distance and echo measurements.
- **Temporal Analysis:** The ESP32 maintains a rolling window of the latest radar readings.
- **Edge AI:** A lightweight TinyML classifier identifies whether the radar signature resembles transient noise or a solid obstacle.
- **Safety Evaluation:** Solid-obstacle detections are passed to distance/TTC-based deterministic safety logic.
- **Response:** The system can activate the local buzzer/warning and, when safety thresholds are reached, trigger the AEB/braking output.

## AI Classification

```text
0 → Transient Noise / False Positive
1 → Solid Obstacle
```
