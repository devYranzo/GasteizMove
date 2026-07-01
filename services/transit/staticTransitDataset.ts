import routeShapesData from "@/data/gtfs/route_shapes.json";
import routeStopSequencesData from "@/data/gtfs/route_stop_sequences.json";
import routesData from "@/data/gtfs/routes.json";
import serviceDatesData from "@/data/gtfs/service_dates.json";
import shapesData from "@/data/gtfs/shapes.json";
import stopsData from "@/data/gtfs/stops.json";
import timetablesData from "@/data/gtfs/timetables.json";
import { TransitDataset } from "@/types/transit";

export const staticTransitDataset: TransitDataset = {
  metadata: {
    id: "vitoria-gasteiz-tuvisa",
    name: "Vitoria-Gasteiz",
    regionId: "vitoria-gasteiz",
    agencyId: "tuvisa",
    modes: ["bus", "night_bus"],
  },
  stops: stopsData as TransitDataset["stops"],
  routes: routesData as TransitDataset["routes"],
  timetables: timetablesData as unknown as TransitDataset["timetables"],
  serviceDates: serviceDatesData as TransitDataset["serviceDates"],
  routeShapes: routeShapesData as TransitDataset["routeShapes"],
  routeStopSequences: routeStopSequencesData as TransitDataset["routeStopSequences"],
  shapes: shapesData as TransitDataset["shapes"],
};
