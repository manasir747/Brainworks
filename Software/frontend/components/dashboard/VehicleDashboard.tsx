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
    <div className="flex min-h-dvh flex-1 flex-col bg-[#07080a] text-[#e7e4de]">
      <header className="flex shrink-0 items-center justify-between px-6 py-4 md:px-8">
        <p className="text-[11px] font-medium tracking-[0.32em] text-white/70 uppercase">
          Brainworks
        </p>
        <p className="font-mono text-[11px] tracking-[0.18em] text-white/30">
          SIH26007
        </p>
      </header>

      <main className="flex min-h-0 flex-1 flex-col border-t border-white/8 lg:flex-row">
        <CameraFeedView camera={telemetry.camera} />

        <aside className="grid shrink-0 grid-cols-1 border-t border-white/8 md:grid-cols-3 lg:flex lg:w-[22rem] lg:flex-col xl:w-96 lg:border-t-0 lg:border-l">
          <div className="border-b border-white/8 md:border-r md:border-b-0 lg:flex lg:flex-1 lg:border-r-0 lg:border-b">
            <SpeedSection speed={telemetry.speed} />
          </div>
          <div className="border-b border-white/8 md:border-r md:border-b-0 lg:flex lg:flex-1 lg:border-r-0 lg:border-b">
            <ObstacleSection obstacle={telemetry.obstacle} />
          </div>
          <div className="lg:flex lg:flex-1">
            <GpsSection gps={telemetry.gps} />
          </div>
        </aside>
      </main>
    </div>
  );
}
