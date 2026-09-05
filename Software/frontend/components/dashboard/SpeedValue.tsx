"use client";

import { useEffect, useState } from "react";

type SpeedValueProps = {
  value: number;
  unit: string;
};

export function SpeedValue({ value, unit }: SpeedValueProps) {
  const [reading, setReading] = useState(value);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setReading((current) => {
        const next = current + (Math.random() > 0.5 ? 1 : -1);
        return Math.min(value + 2, Math.max(value - 2, next));
      });
    }, 3200);

    return () => window.clearInterval(interval);
  }, [value]);

  return (
    <div className="flex items-end gap-2.5">
      <p className="speed-value font-mono text-[4.25rem] leading-none font-light tracking-tight text-[#f3f0ea] tabular-nums md:text-[2.85rem] lg:text-[5rem]">
        {reading}
      </p>
      <p className="mb-2 text-sm tracking-[0.08em] text-white/40">{unit}</p>
    </div>
  );
}
