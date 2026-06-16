import routes from "@/data/gtfs/routes.json";
import { Polyline } from "react-native-maps";

export function RouteLines() {
  return (
    <>
      {routes.map((route) => (
        <Polyline
          key={route.routeId}
          coordinates={route.coordinates.map(([longitude, latitude]) => ({
            latitude,
            longitude,
          }))}
          strokeColor={`#${route.color ?? "2563EB"}`}
          strokeWidth={4}
        />
      ))}
    </>
  );
}
