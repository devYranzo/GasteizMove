import { staticTransitDataset } from "./staticTransitDataset";

export function getTransitDataset() {
  return staticTransitDataset;
}

export function getTransitStops() {
  return getTransitDataset().stops;
}

export function getTransitRoutes() {
  return getTransitDataset().routes;
}

export function getTransitTimetables() {
  return getTransitDataset().timetables;
}

export function getTransitServiceDates() {
  return getTransitDataset().serviceDates;
}

export function getTransitRouteShapes() {
  return getTransitDataset().routeShapes;
}

export function getTransitRouteStopSequences() {
  return getTransitDataset().routeStopSequences;
}

export function getTransitShapes() {
  return getTransitDataset().shapes;
}

export function getTransitRouteColorMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const route of getTransitRoutes()) {
    map[route.routeId] = `#${route.color ?? "2563EB"}`;
  }
  return map;
}
