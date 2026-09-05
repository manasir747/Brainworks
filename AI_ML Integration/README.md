# Brainworks AI/ML Integration

# AI Workflow & Decision Architecture

Brainworks follows a layered safety architecture in which Edge AI improves sensor interpretation while deterministic safety logic remains responsible for the final safety response.

*(Note: The AI/TinyML implementation described below is a Proposed / Planned Implementation for future prototype iterations).*

### 1. Edge AI Radar Classification

This workflow demonstrates how raw radar data is processed locally on the ESP32 to filter out transient noise before it reaches the safety evaluation logic. The AI classifier runs LOCALLY on the ESP32 and does not require cloud processing.

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
    CLASS -->|0| NOISE[Transient Noise]:::normal
    CLASS -->|1| SOLID[Solid Obstacle]:::warning
    
    NOISE --> IGNORE[Ignore False Positive]:::normal
    IGNORE --> CM1[Continue Monitoring]:::logic
    
    SOLID --> PASS[Pass to Safety Evaluation]:::warning
    PASS --> STATE[Distance + TTC + Vehicle State]:::warning
    STATE --> DET[Deterministic Safety Logic]:::logic
    DET --> AEB[Warning / AEB]:::danger
```

### 2. Complete AI-Assisted Safety Workflow

This system-level workflow shows how AI assists the safety system without acting as the sole authority for emergency braking. Deterministic safety rules provide the final safety response.

```mermaid
flowchart TD
    classDef normal fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef warning fill:#854d0e,stroke:#eab308,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef danger fill:#7f1d1d,stroke:#ef4444,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef ai fill:#3730a3,stroke:#818cf8,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef logic fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#fff,rx:8px,ry:8px;

    GPS[GPS Position]:::normal --> ESP32[ESP32 LOCAL PROCESSING]:::logic
    LORA[LoRa / V2X Awareness]:::normal --> ESP32
    RADAR[24 GHz Radar]:::normal --> ESP32
    TELEMETRY[Vehicle Telemetry]:::normal --> ESP32
    
    ESP32 --> FUSION[Sensor Data Fusion]:::logic
    FUSION --> AILAYER["AI INTELLIGENCE LAYER\n- Radar Noise Classification\n- Risk Prediction\n- Anomaly Detection"]:::ai
    
    AILAYER --> EVAL[Risk Evaluation]:::warning
    EVAL --> SIG{"Is Significant Risk Detected?"}:::warning
    
    SIG -->|NO| CM[Continue Monitoring]:::logic
    SIG -->|YES| LW[Local Warning]:::warning
    
    LW --> BUZ[Buzzer / Alert]:::danger
    BUZ --> AEB[Deterministic AEB Logic]:::logic
    AEB --> BRAKE[Brake if Threshold\nConditions Are Met]:::danger
```
*Note: AI assists the safety system but does not act as the sole authority for emergency braking. Deterministic safety rules provide the final safety response.*

### 3. Radar Noise vs Solid Obstacle Example

This example demonstrates why TinyML is useful for filtering environmental disturbances versus solid approaching objects.

```mermaid
flowchart TD
    classDef normal fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef warning fill:#854d0e,stroke:#eab308,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef danger fill:#7f1d1d,stroke:#ef4444,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef ai fill:#3730a3,stroke:#818cf8,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef logic fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#fff,rx:8px,ry:8px;

    subgraph EX_A [Example A]
        direction TB
        A1[Environmental Disturbance]:::normal
        A2[52m → 39m → 61m → 44m → 58m → 47m]:::normal
        A3[High temporal instability]:::normal
        A4[TinyML]:::ai
        A5[Class 0 — Transient Noise]:::normal
        A6[No AEB]:::logic
        A7[Continue Monitoring]:::logic
        
        A1 --> A2 --> A3 --> A4 --> A5 --> A6 --> A7
    end

    subgraph EX_B [Example B]
        direction TB
        B1[Solid Obstacle]:::warning
        B2[58m → 56m → 54m → 52m → 50m → 48m]:::warning
        B3[Consistent approaching pattern]:::warning
        B4[TinyML]:::ai
        B5[Class 1 — Solid Obstacle]:::warning
        B6[Safety Evaluation]:::warning
        B7[TTC / Distance Threshold]:::warning
        B8[Warning → AEB if required]:::danger
        
        B1 --> B2 --> B3 --> B4 --> B5 --> B6 --> B7 --> B8
    end
```

### 4. Hardware + AI Data Flow

This workflow illustrates how the radar data moves through the ESP32 and eventually reaches other vehicles via cooperative awareness.

```mermaid
flowchart TD
    classDef normal fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef warning fill:#854d0e,stroke:#eab308,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef danger fill:#7f1d1d,stroke:#ef4444,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef ai fill:#3730a3,stroke:#818cf8,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef logic fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#fff,rx:8px,ry:8px;

    RADAR[24 GHz Radar]:::normal --> ESP32
    
    subgraph ESP32 [ESP32 - LOCAL EDGE INTELLIGENCE NODE]
        direction TB
        DAQ[Radar Data Acquisition]:::normal
        BUF[Rolling Buffer]:::normal
        FE[Feature Extraction]:::normal
        TML[TinyML Inference]:::ai
        DET[Deterministic Safety Logic]:::logic
        OUT[Buzzer / Warning Output]:::danger
        V2X[LoRa V2X Communication]:::normal
        
        DAQ --> BUF --> FE --> TML --> DET --> OUT
        DET --> V2X
    end
    
    V2X --> OTHERS[Other Brainworks Vehicles]:::normal
    OTHERS --> COOP[Cooperative Awareness]:::normal
```

### 5. AI Training → Deployment → Inference

This diagram clearly distinguishes the offline model development phase from real-time vehicle operation.

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
        D2[Label Data]:::offline
        D3[Create Temporal Windows]:::offline
        D4[Feature Extraction]:::offline
        D5[Train ML Classifier]:::offline
        D6[Validation / Testing]:::offline
        D7[Model Optimization]:::offline
        
        D1 --> D2 --> D3 --> D4 --> D5 --> D6 --> D7
    end
    
    D7 -->|Deploy| R1
    
    subgraph ONLINE [REAL-TIME VEHICLE OPERATION]
        direction TB
        R1[ESP32 Deployment]:::logic
        R2[Real-Time Edge Inference]:::ai
        R3[Safety Evaluation]:::logic
        
        R1 --> R2 --> R3
    end
```

### Architecture Summary

| Layer | Technology | Purpose | Location |
|------|------------|---------|----------|
| Sensing | 24 GHz Radar | Local obstacle detection | Vehicle |
| Edge AI | TinyML Classifier | Radar noise classification | ESP32 |
| Communication | LoRa / V2X | Nearby vehicle awareness | Vehicle-to-Vehicle |
| Risk Evaluation | Rule-based logic | Determine safety state | ESP32 |
| Safety Response | Deterministic AEB | Emergency response | ESP32 |
| Operator Interface | Buzzer / Simulation UI | Warning and visualization | Vehicle / Software |

### Why This Architecture Matters

1. **AI reduces false positives:** By classifying transient noise vs. solid obstacles, unnecessary braking events are minimized.
2. **Edge inference avoids cloud dependency:** Processing data locally on the ESP32 ensures zero latency and works without cellular networks.
3. **V2X provides awareness beyond the local radar field:** LoRa communication enables nodes to share awareness before hazards are visible to radar.
4. **Deterministic logic provides predictable emergency response:** Rule-based logic acts as the final safety authority, ensuring the system always responds safely regardless of AI edge cases.
5. **Fallback safety path:** The architecture continues to provide a baseline deterministic safety path if AI inference becomes temporarily unavailable.