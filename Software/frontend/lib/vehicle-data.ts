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
      id: "cam-front",
      label: "Front haul camera",
    },
    speed: {
      value: 18,
      unit: "km/hr",
    },
    obstacle: {
      status: "clear",
    },
    gps: {
      latitude: 18.6364,
      longitude: 81.2512,
    },
  };
}
