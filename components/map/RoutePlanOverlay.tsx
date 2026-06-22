import routesData from "@/data/gtfs/routes.json";
import { RouteStep, TransitStep, WalkStep } from "@/utils/routing/offlineRouter";
import { useMemo } from "react";
import { Polyline } from "react-native-maps";

interface Props {
  routePlan: RouteStep[];
  version: number;
}

export function RoutePlanOverlay({ routePlan, version }: Props) {
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
          if (walkStep.distanceMeters === 0) return null;
          return (
            <Polyline
              key={`route-plan-${version}-walk-${index}-${walkStep.fromLat}-${walkStep.fromLng}-${walkStep.toLat}-${walkStep.toLng}`}
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

        if (step.type === "transit") {
          const transitStep = step as TransitStep;
          if (!transitStep.shapeCoords?.length) return null;
          const color = routeColorMap[transitStep.routeId] ?? "#2563eb";
          return (
            <Polyline
              key={`route-plan-${version}-transit-${index}-${transitStep.routeId}-${transitStep.fromStopId}-${transitStep.toStopId}-${transitStep.shapeCoords.length}`}
              coordinates={transitStep.shapeCoords}
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
