import type { CameraFeed } from "@/lib/vehicle-data";
import { Panel } from "./Panel";

type CameraPanelProps = {
  camera: CameraFeed;
};

export function CameraPanel({ camera }: CameraPanelProps) {
  return (
    <Panel title="Camera" className="h-full">
      <div className="flex h-full min-h-[220px] flex-col gap-3">
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-md border border-zinc-800 bg-[#1a1d22]">
          <div className="camera-fog absolute inset-0" aria-hidden />
          <div className="absolute inset-0 flex flex-col justify-between p-3">
            <div className="flex items-start justify-between">
              <span className="rounded bg-black/55 px-2 py-0.5 font-mono text-[10px] tracking-widest text-zinc-300 uppercase">
                Mock feed
              </span>
              <span className="font-mono text-[10px] text-zinc-500">{camera.id}</span>
            </div>
            <p className="font-mono text-xs text-zinc-400">{camera.label}</p>
          </div>
        </div>
      </div>
    </Panel>
  );
}
