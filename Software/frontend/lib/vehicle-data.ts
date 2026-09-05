export type CameraFeed = {
  id: string;
  label: string;
};

export type SpeedReading = {
  value: number;
  unit: "km/hr";
};

export type ObstacleStatus = "clear" | "detected";

export type ObstacleReading = {
  status: ObstacleStatus;
};

export type GpsReading = {
  latitude: number;
  longitude: number;
};

export type VehicleTelemetry = {
  camera: CameraFeed;
  speed: SpeedReading;
  obstacle: ObstacleReading;
  gps: GpsReading;
};

/** Mock vehicle telemetry. Replace this function later with a live data source. */
export function getMockVehicleTelemetry(): VehicleTelemetry {
  return {
    camera: {
      id: "CAM-01",
      label: "Forward view",
    },
    speed: {
      value: 32,
      unit: "km/hr",
    },
    obstacle: {
      status: "clear",
    },
    gps: {
      latitude: 18.5204,
      longitude: 73.8567,
    },
  };
}
