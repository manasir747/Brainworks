import type { SpeedReading } from "@/lib/vehicle-data";
import { SpeedValue } from "./SpeedValue";

type SpeedSectionProps = {
  speed: SpeedReading;
};

export function SpeedSection({ speed }: SpeedSectionProps) {
  return (
    <section className="flex h-full w-full flex-col justify-center px-7 py-8 md:px-6 lg:px-10">
      <p className="text-[10px] font-medium tracking-[0.24em] text-white/35 uppercase">
        Vehicle speed
      </p>
      <div className="mt-6">
        <SpeedValue value={speed.value} unit={speed.unit} />
      </div>
    </section>
  );
}
