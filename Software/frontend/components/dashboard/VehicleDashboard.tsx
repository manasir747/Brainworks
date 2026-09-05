import type { VehicleTelemetry } from "@/lib/vehicle-data";
import { CameraFeedView } from "./CameraFeedView";
import { GpsSection } from "./GpsSection";
import { ObstacleSection } from "./ObstacleSection";
import { SpeedSection } from "./SpeedSection";

type VehicleDashboardProps = {
  telemetry: VehicleTelemetry;
};

export function VehicleDashboard({ telemetry }: VehicleDashboardProps) {
  return (
    <div className="flex h-dvh min-h-dvh flex-1 flex-col overflow-hidden bg-[#07080a] text-[#e7e4de]">
      <header className="flex shrink-0 items-center justify-between px-5 py-3 md:px-7 md:py-4 lg:px-8">
        <p className="text-[11px] font-medium tracking-[0.32em] text-white/70 uppercase">
          Brainworks
        </p>
        <p className="font-mono text-[11px] tracking-[0.18em] text-white/30">
          SIH26007
        </p>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-stretch border-t border-white/8 lg:flex-row">
        <CameraFeedView camera={telemetry.camera} />

        <aside className="flex shrink-0 flex-col self-stretch border-t border-white/8 md:flex-row lg:w-80 lg:flex-col lg:border-t-0 lg:border-l xl:w-[22rem] 2xl:w-96">
          <div className="flex flex-1 border-b border-white/8 md:border-r md:border-b-0 lg:border-r-0 lg:border-b">
            <SpeedSection speed={telemetry.speed} />
          </div>
          <div className="flex flex-1 border-b border-white/8 md:border-r md:border-b-0 lg:border-r-0 lg:border-b">
            <ObstacleSection obstacle={telemetry.obstacle} />
          </div>
          <div className="flex flex-1">
            <GpsSection gps={telemetry.gps} />
          </div>
        </aside>
      </main>
    </div>
  );
}
