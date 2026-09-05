import type {
  BackendAlert,
  BackendVehicle,
  WebSocketEvent,
} from "./vehicle-data";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:5001/api";

const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:5001/ws";

type ApiResponse<T> = {
  success: boolean;
  data: T;
  error?: string;
};

async function apiFetch<T>(endpoint: string): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}: ${res.statusText}`;
    try {
      const errJson = await res.json();
      if (errJson?.error) {
        errorMsg = errJson.error;
      }
    } catch {
      // Keep default error message
    }
    throw new Error(errorMsg);
  }

  const json: ApiResponse<T> = await res.json();
  if (!json.success) {
    throw new Error(json.error || "Backend request failed");
  }

  return json.data;
}

export async function fetchVehicles(): Promise<BackendVehicle[]> {
  return apiFetch<BackendVehicle[]>("/vehicles");
}

export async function fetchVehicle(id: string): Promise<BackendVehicle> {
  return apiFetch<BackendVehicle>(`/vehicles/${encodeURIComponent(id)}`);
}

export async function fetchActiveAlerts(): Promise<BackendAlert[]> {
  return apiFetch<BackendAlert[]>("/alerts/active");
}

export async function fetchVehicleAlerts(id: string): Promise<BackendAlert[]> {
  return apiFetch<BackendAlert[]>(
    `/vehicles/${encodeURIComponent(id)}/alerts`
  );
}

export type VehicleUpdatePayload = {
  vehicleId: string;
  vehicleType: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  visibility: number;
  zoneId: string | null;
  lastUpdated: string | null;
};

export type AlertResolvedPayload = {
  alertId: string;
  vehicleId: string;
  status: string;
};

export type SystemStatusPayload = {
  status: string;
  [key: string]: unknown;
};

export type WebSocketCallbacks = {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (err: Event) => void;
  onVehicleUpdate?: (data: VehicleUpdatePayload) => void;
  onSafetyAlert?: (alert: BackendAlert) => void;
  onAlertResolved?: (data: AlertResolvedPayload) => void;
  onSystemStatus?: (data: SystemStatusPayload) => void;
};

export function connectTelemetryWebSocket(
  callbacks: WebSocketCallbacks
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  let ws: WebSocket | null = null;
  let reconnectTimer: NodeJS.Timeout | null = null;
  let pingTimer: NodeJS.Timeout | null = null;
  let isClosedManually = false;
  let reconnectAttempts = 0;

  function connect() {
    try {
      ws = new WebSocket(WS_BASE_URL);

      ws.onopen = () => {
        reconnectAttempts = 0;
        callbacks.onOpen?.();

        // Send periodic keepalive ping
        pingTimer = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "PING" }));
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        try {
          const parsed: WebSocketEvent = JSON.parse(event.data);
          switch (parsed.type) {
            case "VEHICLE_UPDATE":
              callbacks.onVehicleUpdate?.(parsed.data as VehicleUpdatePayload);
              break;
            case "SAFETY_ALERT":
              callbacks.onSafetyAlert?.(parsed.data as BackendAlert);
              break;
            case "ALERT_RESOLVED":
              callbacks.onAlertResolved?.(parsed.data as AlertResolvedPayload);
              break;
            case "SYSTEM_STATUS":
              callbacks.onSystemStatus?.(parsed.data as SystemStatusPayload);
              break;
          }
        } catch (parseErr) {
          console.warn("Could not parse incoming WebSocket message:", parseErr);
        }
      };

      ws.onerror = (err) => {
        callbacks.onError?.(err);
      };

      ws.onclose = () => {
        if (pingTimer) {
          clearInterval(pingTimer);
          pingTimer = null;
        }

        callbacks.onClose?.();

        if (!isClosedManually) {
          // Exponential backoff reconnect
          const delay = Math.min(1000 * 2 ** reconnectAttempts, 10000);
          reconnectAttempts++;
          reconnectTimer = setTimeout(connect, delay);
        }
      };
    } catch (err) {
      console.error("Failed to initialize WebSocket:", err);
      if (!isClosedManually) {
        reconnectTimer = setTimeout(connect, 3000);
      }
    }
  }

  connect();

  return () => {
    isClosedManually = true;
    if (pingTimer) clearInterval(pingTimer);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (ws) {
      ws.close();
      ws = null;
    }
  };
}
