export type RiskLevel = 'SAFE' | 'CAUTION' | 'WARNING' | 'CRITICAL';

export interface Position {
  x: number;
  y: number;
}

export interface Vehicle {
  id: string;
  position: Position;
  speed: number; // m/s
  heading: number; // degrees
  targetPosition: Position | null;
  path: Position[];
  risk: RiskLevel;
  movementState: 'MOVING' | 'STOPPED';
  stopReason: string | null;
  statuses: {
    gps: boolean;
    lora: boolean;
    radar: boolean;
    edge: boolean;
  };
  nearestHazard: {
    distance: number | null;
    type: 'VEHICLE' | 'OBSTACLE' | null;
  };
}

export interface Obstacle {
  id: string;
  position: Position;
  type: 'ROCKFALL' | 'EQUIPMENT' | 'DISABLED_TRUCK' | 'GENERIC';
}

export interface SystemStatus {
  gps: boolean;
  lora: boolean;
  radar: boolean;
  edge: boolean;
  network: boolean;
}

export interface Environment {
  fog: 'CLEAR' | 'LIGHT' | 'DENSE';
  dust: 'OFF' | 'LOW' | 'HIGH';
  rain: boolean;
}

export interface SimulationState {
  isPlaying: boolean;
  speedMultiplier: number;
  scenarioStatus: 'IDLE' | 'LOADING' | 'READY';
  scenarioName: string | null;
  vehicles: Vehicle[];
  obstacles: Obstacle[];
  environment: Environment;
  systemStatus: SystemStatus;
  selectedVehicleId: string | null;
  logs: LogEvent[];
  time: number;
}

export interface LogEvent {
  id: string;
  timestamp: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'CRITICAL';
}
