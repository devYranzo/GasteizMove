import routeShapesData from "@/data/gtfs/route_shapes.json";
import routeStopSequencesData from "@/data/gtfs/route_stop_sequences.json";
import routesData from "@/data/gtfs/routes.json";
import serviceDatesData from "@/data/gtfs/service_dates.json";
import shapesData from "@/data/gtfs/shapes.json";
import stopsData from "@/data/gtfs/stops.json";
import timetablesData from "@/data/gtfs/timetables.json";
import { TransitDataset, TransitMode } from "@/types/transit";
import { getTransitModeForRoute } from "./transitModes";

const metadata: TransitDataset["metadata"] = {
  id: "vitoria-gasteiz-tuvisa",
  name: "Vitoria-Gasteiz",
  regionId: "vitoria-gasteiz",
  agencyId: "tuvisa",
  modes: ["bus", "night_bus"] as TransitMode[],
};

const routes = (routesData as TransitDataset["routes"]).map((route) => ({
  ...route,
  regionId: metadata.regionId,
  agencyId: metadata.agencyId,
  mode: getTransitModeForRoute(route.routeId),
}));

const stops = (stopsData as TransitDataset["stops"]).map((stop) => ({
  ...stop,
  regionId: metadata.regionId,
  agencyId: metadata.agencyId,
  modes: Array.from(
    new Set(stop.routes.map((route) => getTransitModeForRoute(route.id))),
  ),
}));

export const staticTransitDataset: TransitDataset = {
  metadata,
  stops,
  routes,
  timetables: timetablesData as unknown as TransitDataset["timetables"],
  serviceDates: serviceDatesData as TransitDataset["serviceDates"],
  routeShapes: routeShapesData as TransitDataset["routeShapes"],
  routeStopSequences:
    routeStopSequencesData as TransitDataset["routeStopSequences"],
  shapes: shapesData as TransitDataset["shapes"],
};
