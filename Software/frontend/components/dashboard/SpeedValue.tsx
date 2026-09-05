"use client";

import { useEffect, useState } from "react";

type SpeedValueProps = {
  value: number;
  unit: string;
};

export function SpeedValue({ value, unit }: SpeedValueProps) {
  const [reading, setReading] = useState(value);
  const [dimmed, setDimmed] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setDimmed(true);

      window.setTimeout(() => {
        setReading((current) => {
          const next = current + (Math.random() > 0.5 ? 1 : -1);
          return Math.min(value + 2, Math.max(value - 2, next));
        });
        setDimmed(false);
      }, 160);
    }, 3200);

    return () => window.clearInterval(interval);
  }, [value]);

  return (
    <div className="flex items-end gap-2">
      <p
        className={`speed-value font-mono text-6xl leading-none font-light tracking-tight text-[#f3f0ea] tabular-nums sm:text-7xl md:text-5xl lg:text-6xl xl:text-7xl ${
          dimmed ? "opacity-45" : "opacity-100"
        }`}
      >
        {reading}
      </p>
      <p className="mb-1.5 text-xs tracking-[0.08em] text-white/40 sm:text-sm">
        {unit}
      </p>
    </div>
  );
}
