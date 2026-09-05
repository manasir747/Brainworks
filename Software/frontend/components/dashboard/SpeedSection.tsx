import type { SpeedReading } from "@/lib/vehicle-data";
import { SpeedValue } from "./SpeedValue";
import { TelemetryBlock } from "./TelemetryBlock";

type SpeedSectionProps = {
  speed: SpeedReading;
};

export function SpeedSection({ speed }: SpeedSectionProps) {
  return (
    <TelemetryBlock title="Vehicle speed">
      <SpeedValue value={speed.value} unit={speed.unit} />
    </TelemetryBlock>
  );
}
