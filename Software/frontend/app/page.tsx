import { VehicleDashboard } from "@/components/dashboard/VehicleDashboard";
import { getMockVehicleTelemetry } from "@/lib/vehicle-data";

export default function Home() {
  const telemetry = getMockVehicleTelemetry();

  return <VehicleDashboard telemetry={telemetry} />;
}
