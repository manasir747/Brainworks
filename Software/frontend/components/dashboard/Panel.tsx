type PanelProps = {
  title: string;
  children: React.ReactNode;
  className?: string;
};

export function Panel({ title, children, className = "" }: PanelProps) {
  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-lg border border-zinc-700/80 bg-zinc-900/80 ${className}`}
    >
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-700/80 bg-zinc-950/60 px-4 py-2">
        <h2 className="text-[11px] font-semibold tracking-[0.18em] text-zinc-400 uppercase">
          {title}
        </h2>
      </header>
      <div className="min-h-0 flex-1 p-4">{children}</div>
    </section>
  );
}
