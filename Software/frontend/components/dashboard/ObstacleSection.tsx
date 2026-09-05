import type { ObstacleReading } from "@/lib/vehicle-data";

type ObstacleSectionProps = {
  obstacle: ObstacleReading;
};

export function ObstacleSection({ obstacle }: ObstacleSectionProps) {
  const isClear = obstacle.status === "clear";

  return (
    <section className="flex h-full w-full flex-col justify-center px-6 py-6 md:px-5 md:py-5 lg:px-8 lg:py-8 xl:px-10">
      <p className="text-[10px] font-medium tracking-[0.24em] text-white/35 uppercase">
        Obstacle
      </p>
      <div className="mt-4 flex items-center gap-3 md:mt-5 lg:mt-6">
        <span
          className={`size-1.5 shrink-0 rounded-full ${
            isClear ? "bg-[#8fbf9a]" : "bg-[#c45c4a]"
          }`}
          aria-hidden
        />
        <p
          className={`text-lg leading-snug font-medium tracking-[0.06em] uppercase md:text-sm lg:text-lg xl:text-xl ${
            isClear ? "text-[#d7e4d9]" : "text-[#edcfc8]"
          }`}
        >
          {isClear ? "No obstacle" : "Obstacle detected"}
        </p>
      </div>
    </section>
  );
}
