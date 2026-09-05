import type { CameraFeed } from "@/lib/vehicle-data";
import { MineCameraScene } from "./MineCameraScene";

type CameraFeedViewProps = {
  camera: CameraFeed;
};

export function CameraFeedView({ camera }: CameraFeedViewProps) {
  return (
    <section className="relative min-h-[240px] w-full flex-1 overflow-hidden bg-[#1c2026] md:min-h-[280px] lg:min-h-0">
      <MineCameraScene />
      <div className="camera-scan absolute inset-0" />

      <div className="pointer-events-none absolute inset-5 md:inset-6">
        <span className="absolute top-0 left-0 h-7 w-7 border-t border-l border-white/30" />
        <span className="absolute top-0 right-0 h-7 w-7 border-t border-r border-white/30" />
        <span className="absolute bottom-0 left-0 h-7 w-7 border-b border-l border-white/30" />
        <span className="absolute right-0 bottom-0 h-7 w-7 border-b border-r border-white/30" />
      </div>

      <div className="absolute top-5 left-14 flex items-center gap-2.5 md:top-6 md:left-16">
        <span className="live-dot size-1.5 rounded-full bg-[#c45c4a]" />
        <p className="text-[10px] font-medium tracking-[0.24em] text-white/80 uppercase">
          Live camera
        </p>
      </div>

      <p className="absolute top-5 right-14 font-mono text-[10px] tracking-[0.18em] text-white/45 uppercase md:top-6 md:right-16">
        {camera.id}
      </p>

      <p className="absolute bottom-5 left-14 text-[10px] tracking-[0.18em] text-white/40 uppercase md:bottom-6 md:left-16">
        {camera.label}
      </p>
    </section>
  );
}
