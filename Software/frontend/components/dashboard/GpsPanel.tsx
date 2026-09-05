import type { GpsReading } from "@/lib/vehicle-data";
import { Panel } from "./Panel";

type GpsPanelProps = {
  gps: GpsReading;
};

function formatCoordinate(value: number) {
  return value.toFixed(6);
}

export function GpsPanel({ gps }: GpsPanelProps) {
  return (
    <Panel title="GPS">
      <dl className="grid h-full min-h-[88px] grid-cols-2 gap-4">
        <div>
          <dt className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
            Latitude
          </dt>
          <dd className="mt-1 font-mono text-lg text-zinc-100">
            {formatCoordinate(gps.latitude)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
            Longitude
          </dt>
          <dd className="mt-1 font-mono text-lg text-zinc-100">
            {formatCoordinate(gps.longitude)}
          </dd>
        </div>
      </dl>
    </Panel>
  );
}
