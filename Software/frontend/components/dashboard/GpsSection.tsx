import type { GpsReading } from "@/lib/vehicle-data";
import { TelemetryBlock } from "./TelemetryBlock";

type GpsSectionProps = {
  gps: GpsReading;
};

export function GpsSection({ gps }: GpsSectionProps) {
  return (
    <TelemetryBlock title="GPS">
      <div className="flex items-center gap-4 md:gap-3 lg:gap-5">
        <div
          className="relative size-12 shrink-0 border border-white/15 md:size-10 lg:size-12"
          aria-hidden
        >
          <span className="absolute inset-x-0 top-1/2 h-px -translate-y-px bg-white/15" />
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-px bg-white/15" />
          <span className="absolute top-[38%] left-[58%] size-1.5 bg-[#c4a574]" />
        </div>

        <dl className="grid min-w-0 gap-2.5 font-mono">
          <div>
            <dt className="text-[10px] tracking-[0.16em] text-white/30 uppercase">
              Latitude
            </dt>
            <dd className="mt-1 text-sm text-[#f3f0ea] tabular-nums lg:text-base">
              {gps.latitude.toFixed(4)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] tracking-[0.16em] text-white/30 uppercase">
              Longitude
            </dt>
            <dd className="mt-1 text-sm text-[#f3f0ea] tabular-nums lg:text-base">
              {gps.longitude.toFixed(4)}
            </dd>
          </div>
        </dl>
      </div>
    </TelemetryBlock>
  );
}
