import routesData from "@/data/gtfs/routes.json";
import { BusStep, RouteStep, WalkStep } from "@/utils/routing/offlineRouter";
import { useMemo } from "react";
import { Polyline } from "react-native-maps";

interface Props {
  routePlan: RouteStep[];
}

export function RoutePlanOverlay({ routePlan }: Props) {
  const routeColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    routesData.forEach((route) => {
      map[route.routeId] = `#${route.color}`;
    });
    return map;
  }, []);

  if (!routePlan?.length) return null;

  return (
    <>
      {routePlan.map((step: RouteStep, index: number) => {
        if (step.type === "walk") {
          const walkStep = step as WalkStep;
          // No dibujar walk de transbordo (distancia 0)
          if (walkStep.distanceMeters === 0) return null;
          return (
            <Polyline
              key={`walk-${index}`}
              coordinates={[
                { latitude: walkStep.fromLat, longitude: walkStep.fromLng },
                { latitude: walkStep.toLat, longitude: walkStep.toLng },
              ]}
              strokeColor="#111827"
              strokeWidth={3}
              lineDashPattern={[6, 6]}
            />
          );
        }

        if (step.type === "bus") {
          const busStep = step as BusStep;
          if (!busStep.shapeCoords?.length) return null;
          const color = routeColorMap[busStep.routeId] ?? "#2563eb";
          return (
            <Polyline
              key={`bus-${index}`}
              coordinates={busStep.shapeCoords}
              strokeColor={color}
              strokeWidth={5}
            />
          );
        }

        return null;
      })}
    </>
  );
}
