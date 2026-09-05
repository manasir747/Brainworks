# Brainworks AI/ML Integration

## AI/ML Architecture

### Edge AI Architecture

```mermaid
flowchart TD
    classDef normal fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef warning fill:#854d0e,stroke:#eab308,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef danger fill:#7f1d1d,stroke:#ef4444,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef ai fill:#3730a3,stroke:#818cf8,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef logic fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#fff,rx:8px,ry:8px;

    R[24 GHz Radar]:::normal --> RAW[Raw Radar Data]:::normal
    RAW --> ESP32[ESP32 Local Processing]:::logic
    ESP32 --> TINYML[Edge AI / TinyML]:::ai
    TINYML --> CLASS[Radar Noise Classification]:::ai
    
    CLASS --> RESULT{"0 = Transient Noise\n1 = Solid Obstacle"}:::ai
    
    RESULT --> EVAL[Safety Evaluation]:::warning
    EVAL --> DSL[Deterministic Safety Logic]:::logic
    DSL --> OUT[Warning / AEB]:::danger
```

Brainworks currently focuses on an Edge AI subsystem for radar signal classification. Additional AI capabilities may be integrated in future iterations.

## 1. Edge AI — Radar Noise Classification

### 1.1 Problem

Explain the radar false-positive problem caused by:
- Dense falling debris
- Heavy rain
- Dust/environmental interference
- Vehicle vibrations
- Temporary radar reflections

### 1.2 Model

**Status: Proposed / Planned Implementation**

The proposed lightweight classifier:
- Random Forest Classifier OR SVM
- Intended for low-latency Edge AI inference
- Runs locally on ESP32
- No cloud dependency

### 1.3 Input Data

- Last 10 radar distance readings
- Last 10 echo pulse-width readings

The rolling temporal window ensures the system observes trends rather than instantaneous noise points.

### 1.4 Temporal Feature Extraction

- Mean distance
- Minimum distance
- Maximum distance
- Distance variance
- Distance range
- Mean pulse width
- Pulse-width variance
- Distance trend
- Rate of distance change
- Sudden measurement jumps

### 1.5 TinyML Classification

```mermaid
flowchart TD
    classDef normal fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef warning fill:#854d0e,stroke:#eab308,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef danger fill:#7f1d1d,stroke:#ef4444,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef ai fill:#3730a3,stroke:#818cf8,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef logic fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#fff,rx:8px,ry:8px;

    RW[Radar Window]:::normal --> FE[Feature Extraction]:::normal
    FE --> TML[TinyML Classifier]:::ai
    TML --> CLASS[Classification]:::ai
    
    CLASS -->|0| NOISE[Transient Noise / False Positive]:::normal
    CLASS -->|1| SOLID[Solid Obstacle]:::warning
```

### 1.6 Detailed Edge AI Workflow

```mermaid
flowchart TD
    classDef normal fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef warning fill:#854d0e,stroke:#eab308,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef danger fill:#7f1d1d,stroke:#ef4444,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef ai fill:#3730a3,stroke:#818cf8,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef logic fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#fff,rx:8px,ry:8px;

    R[24 GHz Radar]:::normal --> RAW[Raw Radar Distance + Echo Pulse Width]:::normal
    RAW --> RW[Rolling Window\nLast 10 Radar Readings]:::normal
    RW --> FE[Temporal Feature Extraction]:::normal
    FE --> TINYML[TinyML Classifier on ESP32]:::ai
    
    TINYML --> CLASS{"Radar Pattern Classification"}:::ai
    CLASS -->|0 → Transient Noise| IGNORE[Ignore False Positive]:::normal
    IGNORE --> CM1[Continue Monitoring]:::logic
    
    CLASS -->|1 → Solid Obstacle| PASS[Pass to Safety Evaluation]:::warning
    PASS --> STATE[Distance + TTC + Vehicle State]:::warning
    STATE --> DET[Deterministic Safety Logic]:::logic
    DET --> AEB[Warning / AEB]:::danger
```

### 1.7 Safety Integration

Edge AI improves radar interpretation by reducing transient false positives. The final safety response remains governed by deterministic safety rules. AI does NOT directly control emergency braking.

```mermaid
flowchart TD
    classDef normal fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef warning fill:#854d0e,stroke:#eab308,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef danger fill:#7f1d1d,stroke:#ef4444,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef ai fill:#3730a3,stroke:#818cf8,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef logic fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#fff,rx:8px,ry:8px;

    RADAR[Radar]:::normal --> TML[TinyML Classification]:::ai
    TML --> SOLID[Solid Obstacle?]:::warning
    SOLID --> EVAL[Safety Evaluation]:::warning
    EVAL --> STATE[Distance + TTC + Vehicle State]:::warning
    STATE --> DET[Deterministic Safety Logic]:::logic
    DET --> OUT[Warning / AEB]:::danger
```

### 1.8 Failure-Safe Design

If the TinyML inference is unavailable, the system should fall back to a deterministic radar safety fallback.

```mermaid
flowchart TD
    classDef normal fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef warning fill:#854d0e,stroke:#eab308,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef danger fill:#7f1d1d,stroke:#ef4444,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef ai fill:#3730a3,stroke:#818cf8,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef logic fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#fff,rx:8px,ry:8px;

    TML[TinyML unavailable]:::ai --> FALLBACK[Fallback to deterministic radar rules]:::logic
    FALLBACK --> EVAL[Distance / TTC evaluation]:::warning
    EVAL --> RESPONSE[Safety response]:::danger
```

### 1.9 Training Pipeline

```mermaid
flowchart TD
    classDef normal fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef warning fill:#854d0e,stroke:#eab308,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef danger fill:#7f1d1d,stroke:#ef4444,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef ai fill:#3730a3,stroke:#818cf8,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef logic fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef offline fill:#334155,stroke:#94a3b8,stroke-width:2px,color:#fff,rx:8px,ry:8px;

    subgraph OFFLINE [OFFLINE MODEL DEVELOPMENT]
        direction TB
        D1[Radar Data Collection]:::offline
        D2[Label Radar Windows]:::offline
        D3[Feature Extraction]:::offline
        D4[Train Classifier]:::offline
        D5[Validation / Testing]:::offline
        D6[Model Optimization]:::offline
        
        D1 --> D2 --> D3 --> D4 --> D5 --> D6
    end
    
    D6 -->|Deploy| R1
    
    subgraph ONLINE [REAL-TIME ESP32 INFERENCE]
        direction TB
        R1[ESP32 Deployment]:::logic
        R2[Real-Time Edge Inference]:::ai
        
        R1 --> R2
    end
```

### 1.10 Example Scenarios

#### Scenario A — Transient Noise
```mermaid
flowchart TD
    classDef normal fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef warning fill:#854d0e,stroke:#eab308,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef danger fill:#7f1d1d,stroke:#ef4444,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef ai fill:#3730a3,stroke:#818cf8,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef logic fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#fff,rx:8px,ry:8px;

    A1[52m → 39m → 61m → 44m → 58m → 47m]:::normal
    A2[Unstable temporal pattern]:::normal
    A3[TinyML → 0]:::ai
    A4[Transient Noise]:::normal
    A5[Continue Monitoring]:::logic
    
    A1 --> A2 --> A3 --> A4 --> A5
```

#### Scenario B — Solid Obstacle
```mermaid
flowchart TD
    classDef normal fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef warning fill:#854d0e,stroke:#eab308,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef danger fill:#7f1d1d,stroke:#ef4444,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef ai fill:#3730a3,stroke:#818cf8,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef logic fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#fff,rx:8px,ry:8px;

    B1[58m → 56m → 54m → 52m → 50m → 48m]:::warning
    B2[Consistent approaching pattern]:::warning
    B3[TinyML → 1]:::ai
    B4[Solid Obstacle]:::warning
    B5[Safety Evaluation]:::warning
    B6[Warning / AEB if deterministic thresholds are reached]:::danger
    
    B1 --> B2 --> B3 --> B4 --> B5 --> B6
```

### 1.11 Performance Metrics

Evaluation metrics:
- Accuracy
- Precision
- Recall
- F1 Score
- False Positive Rate
- False Negative Rate
- Inference Latency
- RAM Usage
- Flash Usage

### 1.12 Hardware Data Flow

```mermaid
flowchart TD
    classDef normal fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef warning fill:#854d0e,stroke:#eab308,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef danger fill:#7f1d1d,stroke:#ef4444,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef ai fill:#3730a3,stroke:#818cf8,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef logic fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#fff,rx:8px,ry:8px;

    RADAR[24 GHz Radar]:::normal --> ESP32
    
    subgraph ESP32 [ESP32]
        direction TB
        DAQ[Radar Data Acquisition]:::normal
        BUF[Rolling Buffer]:::normal
        FE[Feature Extraction]:::normal
        TML[TinyML Inference]:::ai
        DET[Deterministic Safety Logic]:::logic
        OUT[Buzzer / Warning]:::danger
        V2X[LoRa V2X Communication]:::normal
        
        DAQ --> BUF --> FE --> TML --> DET --> OUT
        DET --> V2X
    end
```
