import type { SpeedReading } from "@/lib/vehicle-data";
import { SpeedValue } from "./SpeedValue";

type SpeedSectionProps = {
  speed: SpeedReading;
};

export function SpeedSection({ speed }: SpeedSectionProps) {
  return (
    <section className="flex h-full w-full flex-col justify-center px-6 py-6 md:px-5 md:py-5 lg:px-8 lg:py-8 xl:px-10">
      <p className="text-[10px] font-medium tracking-[0.24em] text-white/35 uppercase">
        Vehicle speed
      </p>
      <div className="mt-4 md:mt-5 lg:mt-6">
        <SpeedValue value={speed.value} unit={speed.unit} />
      </div>
    </section>
  );
}
