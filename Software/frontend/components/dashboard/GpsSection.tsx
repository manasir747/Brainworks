import type { GpsReading } from "@/lib/vehicle-data";

type GpsSectionProps = {
  gps: GpsReading;
};

export function GpsSection({ gps }: GpsSectionProps) {
  return (
    <section className="flex h-full w-full flex-col justify-center px-7 py-8 md:px-6 lg:px-10">
      <p className="text-[10px] font-medium tracking-[0.24em] text-white/35 uppercase">
        GPS
      </p>

      <div className="mt-6 flex items-center gap-6">
        <div
          className="relative size-14 shrink-0 border border-white/15"
          aria-hidden
        >
          <span className="absolute inset-x-0 top-1/2 h-px -translate-y-px bg-white/15" />
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-px bg-white/15" />
          <span className="absolute top-[38%] left-[58%] size-1.5 bg-[#c4a574]" />
        </div>

        <dl className="grid gap-3 font-mono text-sm">
          <div>
            <dt className="text-[10px] tracking-[0.16em] text-white/30 uppercase">
              Latitude
            </dt>
            <dd className="mt-1 text-base text-[#f3f0ea] tabular-nums">
              {gps.latitude.toFixed(4)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] tracking-[0.16em] text-white/30 uppercase">
              Longitude
            </dt>
            <dd className="mt-1 text-base text-[#f3f0ea] tabular-nums">
              {gps.longitude.toFixed(4)}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
