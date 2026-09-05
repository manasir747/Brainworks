import type { GpsReading } from "@/lib/vehicle-data";

type GpsSectionProps = {
  gps: GpsReading;
};

export function GpsSection({ gps }: GpsSectionProps) {
  return (
    <section className="flex h-full w-full flex-col justify-center px-6 py-6 md:px-5 md:py-5 lg:px-8 lg:py-8 xl:px-10">
      <p className="text-[10px] font-medium tracking-[0.24em] text-white/35 uppercase">
        GPS
      </p>

      <div className="mt-4 flex items-center gap-4 md:mt-5 md:gap-3 lg:mt-6 lg:gap-6">
        <div
          className="relative hidden size-14 shrink-0 border border-white/15 sm:block md:size-10 lg:size-14"
          aria-hidden
        >
          <span className="absolute inset-x-0 top-1/2 h-px -translate-y-px bg-white/15" />
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-px bg-white/15" />
          <span className="absolute top-[38%] left-[58%] size-1.5 bg-[#c4a574]" />
        </div>

        <dl className="grid min-w-0 gap-2.5 font-mono text-sm md:gap-2">
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
    </section>
  );
}
