"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { VehicleDashboard } from "@/components/dashboard/VehicleDashboard";
import {
  fetchVehicles,
  fetchActiveAlerts,
  connectTelemetryWebSocket,
} from "@/lib/api";
import {
  BackendVehicle,
  BackendAlert,
  transformVehicleToTelemetry,
} from "@/lib/vehicle-data";

export default function Home() {
  const [vehicles, setVehicles] = useState<BackendVehicle[]>([]);
  const [alerts, setAlerts] = useState<BackendAlert[]>([]);
  const [selectedId, setSelectedId] = useState<string>(
    process.env.NEXT_PUBLIC_DEFAULT_VEHICLE_ID || ""
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected" | "reconnecting"
  >("connecting");

  // Manual retry handler
  const handleRetry = async () => {
    setLoading(true);
    setError(null);
    try {
      const [vehicleList, activeAlerts] = await Promise.all([
        fetchVehicles(),
        fetchActiveAlerts().catch((err: unknown) => {
          console.warn("Could not fetch active alerts:", err);
          return [] as BackendAlert[];
        }),
      ]);

      setVehicles(vehicleList);
      setAlerts(activeAlerts);

      if (vehicleList.length > 0) {
        setSelectedId((current) => {
          const exists = vehicleList.some((v) => v.id === current);
          return exists ? current : vehicleList[0].id;
        });
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load telemetry data from backend"
      );
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    let ignore = false;

    async function initialize() {
      try {
        const [vehicleList, activeAlerts] = await Promise.all([
          fetchVehicles(),
          fetchActiveAlerts().catch((err: unknown) => {
            console.warn("Could not fetch active alerts:", err);
            return [] as BackendAlert[];
          }),
        ]);

        if (!ignore) {
          setVehicles(vehicleList);
          setAlerts(activeAlerts);

          if (vehicleList.length > 0) {
            setSelectedId((current) => {
              const exists = vehicleList.some((v) => v.id === current);
              return exists ? current : vehicleList[0].id;
            });
          }
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load telemetry data from backend"
          );
          setLoading(false);
        }
      }
    }

    initialize();

    return () => {
      ignore = true;
    };
  }, []);

  // WebSocket connection for real-time telemetry updates
  useEffect(() => {
    const disconnect = connectTelemetryWebSocket({
      onOpen: () => {
        setConnectionStatus("connected");
      },
      onClose: () => {
        setConnectionStatus("reconnecting");
      },
      onError: () => {
        setConnectionStatus("disconnected");
      },
      onVehicleUpdate: (update) => {
        setVehicles((prev) =>
          prev.map((v) =>
            v.id === update.vehicleId
              ? {
                  ...v,
                  latitude: update.latitude,
                  longitude: update.longitude,
                  speed: update.speed,
                  heading: update.heading,
                  visibility: update.visibility,
                  zoneId: update.zoneId,
                  lastUpdated: update.lastUpdated,
                }
              : v
          )
        );
      },
      onSafetyAlert: (newAlert) => {
        setAlerts((prev) => {
          const filtered = prev.filter(
            (a) => (a.alertId || a.id) !== (newAlert.alertId || newAlert.id)
          );
          return [...filtered, newAlert];
        });
      },
      onAlertResolved: ({ alertId }) => {
        setAlerts((prev) =>
          prev.filter((a) => (a.alertId || a.id) !== alertId)
        );
      },
    });

    return () => {
      disconnect();
    };
  }, []);

  // Loading State
  if (loading) {
    return (
      <div className="flex h-dvh min-h-dvh flex-1 flex-col overflow-hidden bg-[#07080a] text-[#e7e4de]">
        <header className="flex shrink-0 items-center justify-between px-5 py-3 md:px-7 lg:px-8 border-b border-white/8">
          <Image
            src="/logo.png"
            alt="Brainworks"
            width={994}
            height={106}
            className="h-5.5 w-auto object-contain"
            priority
          />
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#c4a574] animate-ping" />
            <span className="font-mono text-xs text-white/50 tracking-wider">
              CONNECTING TO MINE NETWORK...
            </span>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col items-stretch lg:flex-row animate-pulse">
          <div className="flex-1 bg-[#12151b]/60 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="mx-auto size-10 border-2 border-white/20 border-t-white/80 rounded-full animate-spin mb-4" />
              <p className="font-mono text-xs tracking-[0.2em] text-white/40 uppercase">
                Initializing Telemetry Stream
              </p>
            </div>
          </div>
          <aside className="lg:w-96 flex flex-col border-t border-white/8 lg:border-t-0 lg:border-l">
            <div className="flex-1 border-b border-white/8 p-6 bg-white/[0.02]" />
            <div className="flex-1 border-b border-white/8 p-6 bg-white/[0.02]" />
            <div className="flex-1 p-6 bg-white/[0.02]" />
          </aside>
        </main>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="flex h-dvh min-h-dvh flex-1 flex-col items-center justify-center bg-[#07080a] text-[#e7e4de] px-6">
        <div className="max-w-md w-full border border-white/10 bg-[#121418] p-8 rounded-lg text-center shadow-2xl">
          <div className="mx-auto mb-4 size-10 rounded-full bg-[#c45c4a]/15 text-[#c45c4a] flex items-center justify-center font-mono text-lg font-bold">
            !
          </div>
          <h2 className="text-lg font-medium tracking-wider uppercase text-white/90 mb-2">
            Telemetry Connection Error
          </h2>
          <p className="font-mono text-xs text-white/50 mb-6 leading-relaxed">
            {error}
          </p>
          <button
            onClick={handleRetry}
            className="w-full rounded bg-white/10 hover:bg-white/20 text-white font-mono text-xs tracking-wider uppercase py-2.5 transition-colors border border-white/15 cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Empty State (no vehicles in backend)
  if (vehicles.length === 0) {
    return (
      <div className="flex h-dvh min-h-dvh flex-1 flex-col items-center justify-center bg-[#07080a] text-[#e7e4de] px-6">
        <div className="max-w-md w-full border border-white/10 bg-[#121418] p-8 rounded-lg text-center shadow-2xl">
          <div className="mx-auto mb-4 size-10 rounded-full bg-[#c4a574]/15 text-[#c4a574] flex items-center justify-center font-mono text-base">
            0
          </div>
          <h2 className="text-lg font-medium tracking-wider uppercase text-white/90 mb-2">
            No Vehicles Detected
          </h2>
          <p className="font-mono text-xs text-white/50 mb-6 leading-relaxed">
            The backend reported 0 active or registered vehicle nodes in the mine
            safety perimeter.
          </p>
          <button
            onClick={handleRetry}
            className="w-full rounded bg-white/10 hover:bg-white/20 text-white font-mono text-xs tracking-wider uppercase py-2.5 transition-colors border border-white/15 cursor-pointer"
          >
            Scan For Vehicles
          </button>
        </div>
      </div>
    );
  }

  // Active Vehicle Data
  const currentVehicle =
    vehicles.find((v) => v.id === selectedId) || vehicles[0];
  const telemetry = transformVehicleToTelemetry(currentVehicle, alerts);

  const vehicleOptions = vehicles.map((v) => ({
    id: v.id,
    type: v.type,
  }));

  return (
    <VehicleDashboard
      telemetry={telemetry}
      vehicles={vehicleOptions}
      selectedVehicleId={currentVehicle.id}
      onSelectVehicle={setSelectedId}
      connectionStatus={connectionStatus}
    />
  );
}
