import type { TrackSafety } from "@/lib/vehicle-data";
import { TelemetryBlock } from "./TelemetryBlock";

type TrackSafetySectionProps = {
  safety: TrackSafety;
};

function SafetyMeter({
  label,
  value,
  fillClass,
}: {
  label: string;
  value: number;
  fillClass: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[10px] tracking-[0.16em] text-white/30 uppercase">
          {label}
        </p>
        <p className="font-mono text-sm text-[#f3f0ea] tabular-nums">{value}%</p>
      </div>
      <div className="mt-2 h-px w-full bg-white/10">
        <div
          className={`h-px ${fillClass} transition-[width] duration-500 ease-out`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

export function TrackSafetySection({ safety }: TrackSafetySectionProps) {
  const isSafe = safety.status === "safe";

  return (
    <TelemetryBlock title="Track safety">
      <div className="flex items-center gap-3">
        <span
          className={`size-1.5 shrink-0 rounded-full ${
            isSafe ? "bg-[#8fbf9a]" : "bg-[#c45c4a]"
          }`}
          aria-hidden
        />
        <p
          className={`text-lg leading-snug font-medium tracking-[0.08em] uppercase md:text-base lg:text-lg ${
            isSafe ? "text-[#d7e4d9]" : "text-[#edcfc8]"
          }`}
        >
          {isSafe ? "Safe" : "Not safe"}
        </p>
      </div>

      <div className="mt-5 grid gap-3.5">
        <SafetyMeter
          label="Accident chance"
          value={safety.accidentChance}
          fillClass={isSafe ? "bg-[#8fbf9a]/70" : "bg-[#c45c4a]/80"}
        />
        <SafetyMeter
          label="Prediction"
          value={safety.predictionPercent}
          fillClass="bg-[#c4a574]/80"
        />
      </div>
    </TelemetryBlock>
  );
}
