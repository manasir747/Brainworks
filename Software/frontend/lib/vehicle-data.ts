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
  distanceMeters?: number;
  severity?: string;
  message?: string;
};

export type GpsReading = {
  latitude: number;
  longitude: number;
};

export type VehicleTelemetry = {
  vehicleId: string;
  vehicleType: string;
  status: string;
  heading: number;
  visibility: number;
  zoneId: string | null;
  lastUpdated: string | null;
  camera: CameraFeed;
  speed: SpeedReading;
  obstacle: ObstacleReading;
  gps: GpsReading;
};

export type BackendVehicle = {
  id: string;
  type: string;
  status: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  visibility: number;
  zoneId?: string | null;
  lastUpdated?: string | null;
};

export type AlertFactor = {
  type: string;
  value: number;
  message: string;
};

export type BackendAlert = {
  alertId?: string;
  id?: string;
  vehicleId: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;
  riskScore: number;
  type: string;
  message: string;
  factors?: AlertFactor[];
  zoneId?: string | null;
  status?: string;
  resolved?: boolean;
  createdAt?: string;
  timestamp?: string;
};

export type WebSocketEvent = {
  type: "SYSTEM_STATUS" | "VEHICLE_UPDATE" | "SAFETY_ALERT" | "ALERT_RESOLVED" | "ERROR";
  timestamp: string;
  data: unknown;
};

export function transformVehicleToTelemetry(
  vehicle: BackendVehicle,
  alerts: BackendAlert[] = []
): VehicleTelemetry {
  const vehicleAlerts = alerts.filter(
    (a) =>
      a.vehicleId === vehicle.id &&
      (a.status === "ACTIVE" || a.resolved === false)
  );

  // Check if any active alert indicates proximity / obstacle
  const proximityAlert = vehicleAlerts.find(
    (a) =>
      a.type === "PROXIMITY" ||
      a.type === "PROXIMITY_RISK" ||
      a.factors?.some((f) => f.type === "PROXIMITY")
  );

  const proximityFactor = proximityAlert?.factors?.find(
    (f) => f.type === "PROXIMITY"
  );

  const obstacleStatus: ObstacleStatus = proximityAlert ? "detected" : "clear";

  const formattedType = vehicle.type ? vehicle.type.replace(/_/g, " ") : "Vehicle";

  return {
    vehicleId: vehicle.id,
    vehicleType: vehicle.type,
    status: vehicle.status,
    heading: vehicle.heading,
    visibility: vehicle.visibility,
    zoneId: vehicle.zoneId || null,
    lastUpdated: vehicle.lastUpdated || null,
    camera: {
      id: `CAM-${vehicle.id}`,
      label: `${formattedType} forward view`,
    },
    speed: {
      value: Math.round(vehicle.speed),
      unit: "km/hr",
    },
    obstacle: {
      status: obstacleStatus,
      distanceMeters: proximityFactor?.value,
      severity: proximityAlert?.severity,
      message: proximityAlert?.message,
    },
    gps: {
      latitude: vehicle.latitude,
      longitude: vehicle.longitude,
    },
  };
}
