import type { VehicleTelemetry } from "@/lib/vehicle-data";
import Image from "next/image";
import { CameraFeedView } from "./CameraFeedView";
import { GpsSection } from "./GpsSection";
import { ObstacleSection } from "./ObstacleSection";
import { SpeedSection } from "./SpeedSection";
import { TrackSafetySection } from "./TrackSafetySection";

type VehicleOption = {
  id: string;
  type: string;
};

type VehicleDashboardProps = {
  telemetry: VehicleTelemetry;
  vehicles?: VehicleOption[];
  selectedVehicleId?: string;
  onSelectVehicle?: (id: string) => void;
  connectionStatus?: "connected" | "disconnected" | "reconnecting" | "connecting";
};

export function VehicleDashboard({
  telemetry,
  vehicles = [],
  selectedVehicleId,
  onSelectVehicle,
  connectionStatus = "connected",
}: VehicleDashboardProps) {
  const isLive = connectionStatus === "connected";
  const isReconnecting = connectionStatus === "reconnecting" || connectionStatus === "connecting";

  return (
    <div className="flex h-dvh min-h-dvh flex-1 flex-col overflow-hidden bg-[#07080a] text-[#e7e4de]">
      <header className="flex shrink-0 items-center justify-between px-5 py-3 md:px-7 lg:px-8">
        <div className="flex items-center gap-4">
          <Image
            src="/logo.png"
            alt="Brainworks"
            width={994}
            height={106}
            className="h-5.5 w-auto object-contain"
            priority
          />

          {vehicles.length > 1 && onSelectVehicle && (
            <div className="hidden sm:flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-mono">
              <span className="text-white/40">NODE:</span>
              <select
                value={selectedVehicleId || telemetry.vehicleId}
                onChange={(e) => onSelectVehicle(e.target.value)}
                className="bg-transparent font-medium text-white/90 focus:outline-none cursor-pointer"
                aria-label="Select vehicle node"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id} className="bg-[#121418] text-white">
                    {v.id} ({v.type})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Connection status indicator */}
          <div
            className="flex items-center gap-1.5 text-[10px] font-mono tracking-[0.14em] uppercase"
            title={`Telemetry WebSocket: ${connectionStatus}`}
          >
            <span
              className={`size-1.5 rounded-full ${
                isLive
                  ? "bg-[#8fbf9a] shadow-[0_0_8px_#8fbf9a]"
                  : isReconnecting
                  ? "bg-[#c4a574] animate-pulse"
                  : "bg-[#c45c4a]"
              }`}
              aria-hidden
            />
            <span
              className={
                isLive
                  ? "text-white/50"
                  : isReconnecting
                  ? "text-[#c4a574]"
                  : "text-[#c45c4a]"
              }
            >
              {isLive ? "LIVE" : isReconnecting ? "RECONNECTING" : "OFFLINE"}
            </span>
          </div>

          <p className="hidden xs:block font-mono text-[11px] tracking-[0.18em] text-white/30">
            SIH26007
          </p>
        </div>
      </header>

      {/* Disconnected / offline warning banner if stream drops */}
      {!isLive && (
        <div className="bg-[#1f1614] border-b border-[#c45c4a]/30 px-5 py-1.5 text-center text-xs font-mono text-[#e7a396]">
          {isReconnecting
            ? "Reconnecting to live mine telemetry stream..."
            : "Disconnected from backend server. Telemetry stream paused."}
        </div>
      )}

      <main className="flex min-h-0 flex-1 flex-col items-stretch border-t border-white/8 lg:flex-row">
        <CameraFeedView camera={telemetry.camera} />

        <aside className="grid shrink-0 grid-cols-1 self-stretch border-t border-white/8 md:grid-cols-2 lg:flex lg:w-[22rem] lg:flex-col xl:w-96 lg:border-t-0 lg:border-l">
          <div className="flex min-h-0 flex-1 border-b border-white/8 md:border-r lg:border-r-0">
            <SpeedSection speed={telemetry.speed} />
          </div>
          <div className="flex min-h-0 flex-1 border-b border-white/8">
            <ObstacleSection obstacle={telemetry.obstacle} />
          </div>
          <div className="flex min-h-0 flex-1 border-b border-white/8 md:border-r lg:border-r-0">
            <TrackSafetySection safety={telemetry.trackSafety} />
          </div>
          <div className="flex min-h-0 flex-1">
            <GpsSection gps={telemetry.gps} />
          </div>
        </aside>
      </main>
    </div>
  );
}
