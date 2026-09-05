# Brainworks — AI/ML Integration

Brainworks combines two complementary AI/ML integrations: Edge AI for real-time radar interpretation on the vehicle, and Cloud AI for analyzing accumulated near-miss events to identify high-risk zones across the mine.

**Current AI/ML Integrations**
- Edge AI — TinyML Radar Noise Classification
- Cloud AI — Predictive Hazard Mapping

## Main AI/ML Architecture

```mermaid
flowchart TD
    classDef normal fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef warning fill:#854d0e,stroke:#eab308,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef danger fill:#7f1d1d,stroke:#ef4444,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef ai fill:#3730a3,stroke:#818cf8,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef logic fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#fff,rx:8px,ry:8px;

    PIPELINE[BRAINWORKS AI / ML PIPELINE]:::normal --> SENSORS[VEHICLE SENSOR DATA]:::normal
    SENSORS --> RADAR[Radar]:::normal
    SENSORS --> GPS[GPS]:::normal
    SENSORS --> V2X[V2X]:::normal
    
    RADAR --> ESP32[ESP32 Local Processing]:::normal
    GPS --> ESP32
    V2X --> ESP32
    
    ESP32 --> AILAYER[AI / ML LAYER]:::ai
    
    AILAYER --> EDGEAI[EDGE AI\nTinyML Radar\nClassification]:::ai
    AILAYER --> CLOUDAI[CLOUD AI\nPredictive\nHazard Mapping]:::ai
    
    EDGEAI --> IMMSAFE[Immediate\nSafety Response]:::logic
    CLOUDAI --> AGGDATA[Aggregated\nNear-Miss Data]:::normal
    
    IMMSAFE --> BUZZER[Buzzer / AEB / Warning]:::danger
    AGGDATA --> HEATMAP[Mine Risk Heatmap]:::warning
    
    HEATMAP --> MINEMAN[Mine Management / Safer Planning]:::logic
```

# 1. Edge AI — Radar Noise Classification (TinyML)

Raw 24 GHz radar can produce transient false positives caused by falling debris, heavy rain, dust, or vehicle vibration. A lightweight TinyML classifier running directly on the ESP32 analyzes a short temporal window of radar measurements to distinguish transient noise from a persistent physical obstacle.

**Status: Proposed / Planned Implementation**

### Workflow

```mermaid
flowchart TD
    classDef normal fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef warning fill:#854d0e,stroke:#eab308,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef danger fill:#7f1d1d,stroke:#ef4444,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef ai fill:#3730a3,stroke:#818cf8,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef logic fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#fff,rx:8px,ry:8px;

    R[24 GHz Radar]:::normal --> MEAS[Distance + Echo Measurements]:::normal
    MEAS --> ESP32[ESP32 Local Processing]:::normal
    ESP32 --> TW[Rolling Temporal Window]:::normal
    TW --> TML[TinyML Radar Classifier]:::ai
    
    TML --> CLASS{"Noise or Solid Obstacle?"}:::ai
    
    CLASS -->|Transient Noise| NOISE[Transient Noise]:::normal
    CLASS -->|Solid Obstacle| SOLID[Solid Obstacle]:::warning
    
    NOISE --> CM[Continue Monitoring]:::logic
    
    SOLID --> EVAL[Safety Evaluation]:::warning
    EVAL --> TTC[Distance + TTC]:::warning
    TTC --> DET[Deterministic Safety Logic]:::logic
    
    DET --> CM2[Continue Monitoring]:::logic
    DET --> HAZ[Warning / AEB]:::danger
    HAZ --> WARN[Buzzer / Brake]:::danger
```

### Key Points

- **Input:** Last 10 radar distance readings + echo pulse widths.
- **Model:** Lightweight TinyML classifier such as Random Forest or SVM.
- **Output:** `0 = Transient Noise`, `1 = Solid Obstacle`.
- **Execution:** Local inference on ESP32 with no cloud dependency.
- **Safety:** AI assists perception; deterministic rules handle the final safety response.

# 2. Cloud AI — Predictive Hazard Mapping

While vehicles operate in the mine, Brainworks records near-miss events whenever safety warnings such as V2X or radar alerts are triggered. When vehicles return to a Wi-Fi-enabled base station, these events can be synchronized with a central database for mine-wide analysis.

**Problem:**  
Mine managers need to identify where near-misses repeatedly occur so that high-risk sections of haul roads can be improved before they become accident locations.

**Model:** DBSCAN (Density-Based Spatial Clustering of Applications with Noise)

**Input:** Aggregated near-miss event data containing:
- Latitude
- Longitude
- Speed
- Timestamp

**Output:** Predictive spatial heatmap showing clusters of high-risk zones along haul roads.

**Status: Proposed / Planned Implementation**

### Workflow

```mermaid
flowchart TD
    classDef normal fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef warning fill:#854d0e,stroke:#eab308,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef danger fill:#7f1d1d,stroke:#ef4444,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef ai fill:#3730a3,stroke:#818cf8,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef logic fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#fff,rx:8px,ry:8px;

    VEHICLE[Vehicle Operation]:::normal --> WARN[Radar / V2X Warning]:::warning
    WARN --> EVENT[Near-Miss Event Logged]:::warning
    EVENT --> LOCAL[Stored Locally]:::normal
    LOCAL --> WIFI[Vehicle Reaches Wi-Fi Base Station]:::normal
    WIFI --> SYNC[Sync to Central Database]:::normal
    SYNC --> DATA[Aggregated Near-Miss Dataset]:::normal
    DATA --> CLUST[DBSCAN Clustering]:::ai
    CLUST --> SPATIAL[Spatial Risk Clusters]:::warning
    SPATIAL --> HEAT[Predictive Hazard Heatmap]:::warning
    HEAT --> MANAGER[Mine Manager / Safety Planning]:::logic
```

### Key Points

- **Data:** Near-miss events generated by radar/V2X safety alerts.
- **Fields:** Latitude, Longitude, Speed, Timestamp.
- **ML Model:** DBSCAN for spatial density clustering.
- **Output:** High-risk spatial clusters and predictive hazard heatmap.
- **Purpose:** Help mine managers identify recurring danger zones and prioritize infrastructure/safety improvements.
- **Connectivity:** Vehicles can collect events offline and synchronize them when Wi-Fi connectivity becomes available at the base station.

## AI/ML Integration Summary

| Integration | Where AI Runs | Input | Output | Purpose |
|---|---|---|---|---|
| Edge AI — TinyML | ESP32 / Vehicle | Radar temporal data | Noise / Solid Obstacle | Immediate local safety |
| Cloud AI — DBSCAN | Central system | Near-miss GPS/event data | Risk clusters / Heatmap | Mine-wide predictive safety |

> **Edge AI protects the vehicle in the moment. Cloud AI learns from accumulated events to make the mine safer over time.**

> **AI improves perception and prediction; deterministic safety logic remains responsible for the final immediate safety response.**
