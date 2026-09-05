type VehicleOption = {
  id: string;
  type: string;
};

type VehicleSelectorProps = {
  vehicles: VehicleOption[];
  value: string;
  onChange: (id: string) => void;
};

function formatVehicleType(type: string) {
  return type.replace(/_/g, " ").toLowerCase();
}

export function VehicleSelector({
  vehicles,
  value,
  onChange,
}: VehicleSelectorProps) {
  return (
    <label className="relative ml-1 flex min-w-0 items-center gap-3 border-l border-white/10 pl-4">
      <span className="hidden text-[10px] font-medium tracking-[0.24em] text-white/35 uppercase sm:inline">
        Vehicle
      </span>
      <span className="relative inline-flex min-w-0 items-center">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label="Select vehicle"
          className="max-w-[11rem] cursor-pointer appearance-none bg-transparent py-0.5 pr-6 text-sm text-[#f3f0ea] outline-none transition-colors hover:text-white focus-visible:text-white md:max-w-[14rem]"
        >
          {vehicles.map((vehicle) => (
            <option
              key={vehicle.id}
              value={vehicle.id}
              className="bg-[#121418] text-[#e7e4de]"
            >
              {vehicle.id} · {formatVehicleType(vehicle.type)}
            </option>
          ))}
        </select>
        <svg
          viewBox="0 0 12 12"
          className="pointer-events-none absolute top-1/2 right-0 size-3 -translate-y-1/2 text-white/35"
          aria-hidden
        >
          <path
            d="M3 4.5 L6 7.5 L9 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </label>
  );
}
