import type { ObstacleReading } from "@/lib/vehicle-data";
import { Panel } from "./Panel";

type ObstaclePanelProps = {
  obstacle: ObstacleReading;
};

export function ObstaclePanel({ obstacle }: ObstaclePanelProps) {
  const isClear = obstacle.status === "clear";

  return (
    <Panel title="Obstacle">
      <div className="flex h-full min-h-[88px] items-center gap-3">
        <span
          className={`size-2.5 shrink-0 rounded-full ${
            isClear ? "bg-emerald-400" : "bg-amber-400"
          }`}
          aria-hidden
        />
        <p
          className={`font-mono text-2xl font-semibold tracking-wide uppercase ${
            isClear ? "text-emerald-300" : "text-amber-300"
          }`}
        >
          {isClear ? "Clear" : "Detected"}
        </p>
      </div>
    </Panel>
  );
}
