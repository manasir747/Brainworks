type TelemetryBlockProps = {
  title: string;
  children: React.ReactNode;
};

export function TelemetryBlock({ title, children }: TelemetryBlockProps) {
  return (
    <section className="group flex h-full w-full flex-col justify-center px-6 py-4 transition-colors duration-200 md:px-5 lg:px-8 lg:py-6">
      <p className="text-[10px] font-medium tracking-[0.24em] text-white/35 uppercase transition-colors duration-200 group-hover:text-white/55">
        {title}
      </p>
      <div className="mt-4 lg:mt-5">{children}</div>
    </section>
  );
}
