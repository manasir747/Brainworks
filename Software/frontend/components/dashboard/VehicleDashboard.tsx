import type { VehicleTelemetry } from "@/lib/vehicle-data";
import { CameraPanel } from "./CameraPanel";
import { GpsPanel } from "./GpsPanel";
import { ObstaclePanel } from "./ObstaclePanel";
import { SpeedPanel } from "./SpeedPanel";

type VehicleDashboardProps = {
  telemetry: VehicleTelemetry;
};

export function VehicleDashboard({ telemetry }: VehicleDashboardProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#0c0e11] text-zinc-100">
      <header className="flex shrink-0 items-baseline justify-between gap-4 border-b border-zinc-800 px-5 py-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.22em] text-amber-500/90 uppercase">
            Brainworks
          </p>
          <h1 className="mt-0.5 text-sm font-medium text-zinc-200">
            Mine vehicle dashboard
          </h1>
        </div>
        <p className="text-right font-mono text-[11px] text-zinc-500">
          SIH26007
        </p>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
        <CameraPanel camera={telemetry.camera} />
        <div className="grid min-h-0 grid-rows-[auto_auto_auto] gap-4">
          <SpeedPanel speed={telemetry.speed} />
          <ObstaclePanel obstacle={telemetry.obstacle} />
          <GpsPanel gps={telemetry.gps} />
        </div>
      </main>
    </div>
  );
}
