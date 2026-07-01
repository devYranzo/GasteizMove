import { TransitVehicle } from "@/types/transit";
import { LiveVehicles } from "./LiveVehicles";

interface Props {
  buses: TransitVehicle[];
}

export function LiveBuses({ buses }: Props) {
  return <LiveVehicles vehicles={buses} />;
}
