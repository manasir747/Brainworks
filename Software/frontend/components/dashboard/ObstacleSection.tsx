import type { ObstacleReading } from "@/lib/vehicle-data";
import { TelemetryBlock } from "./TelemetryBlock";

type ObstacleSectionProps = {
  obstacle: ObstacleReading;
};

export function ObstacleSection({ obstacle }: ObstacleSectionProps) {
  const isClear = obstacle.status === "clear";

  return (
    <TelemetryBlock title="Obstacle">
      <div className="flex items-center gap-3">
        <span
          className={`size-1.5 shrink-0 rounded-full ${
            isClear ? "bg-[#8fbf9a]" : "bg-[#c45c4a]"
          }`}
          aria-hidden
        />
        <p
          className={`text-lg leading-snug font-medium tracking-[0.08em] uppercase md:text-base lg:text-lg xl:text-xl ${
            isClear ? "text-[#d7e4d9]" : "text-[#edcfc8]"
          }`}
        >
          {isClear ? "No obstacle" : "Obstacle detected"}
        </p>
      </div>
    </TelemetryBlock>
  );
}
