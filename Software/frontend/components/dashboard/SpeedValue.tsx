"use client";

type SpeedValueProps = {
  value: number;
  unit: string;
};

export function SpeedValue({ value, unit }: SpeedValueProps) {
  return (
    <div className="flex items-end gap-2">
      <p className="speed-value font-mono text-5xl leading-none font-light tracking-tight text-[#f3f0ea] tabular-nums transition-opacity duration-150 md:text-[2.75rem] lg:text-6xl xl:text-7xl">
        {value}
      </p>
      <p className="mb-1 text-xs tracking-[0.08em] text-white/40 lg:mb-1.5 lg:text-sm">
        {unit}
      </p>
    </div>
  );
}
