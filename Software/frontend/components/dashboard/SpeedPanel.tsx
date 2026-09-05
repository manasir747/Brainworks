import type { SpeedReading } from "@/lib/vehicle-data";
import { Panel } from "./Panel";

type SpeedPanelProps = {
  speed: SpeedReading;
};

export function SpeedPanel({ speed }: SpeedPanelProps) {
  return (
    <Panel title="Vehicle Speed">
      <div className="flex h-full min-h-[88px] items-end gap-2">
        <p className="font-mono text-5xl font-semibold leading-none tracking-tight text-zinc-50">
          {speed.value}
        </p>
        <p className="mb-1 text-sm font-medium tracking-wide text-zinc-400">
          {speed.unit}
        </p>
      </div>
    </Panel>
  );
}
