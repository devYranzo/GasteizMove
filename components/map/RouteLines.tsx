import { getTransitRoutes } from "@/services/transit/transitRepository";
import { Polyline } from "react-native-maps";

interface Props {
  selectedRouteId: string | null;
}

export function RouteLines({ selectedRouteId }: Props) {
  if (!selectedRouteId) return null;
  const routes = getTransitRoutes();

  return (
    <>
      {routes
        .filter((route) => route.routeId === selectedRouteId)
        .map((route) => (
          <Polyline
            key={`${route.routeId}-${route.shapeId}`}
            coordinates={route.coordinates.map(([longitude, latitude]) => ({
              latitude,
              longitude,
            }))}
            strokeColor={`#${route.color ?? "2563EB"}`}
            strokeWidth={5}
          />
        ))}
    </>
  );
}
