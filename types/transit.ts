export type TransitMode = "bus" | "tram" | "night_bus";

export type TransitStopRoute = {
  id: string;
  name: string;
};

export type TransitStop = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  routes: TransitStopRoute[];
  regionId?: string;
  agencyId?: string;
  modes?: TransitMode[];
};

export type TransitRoute = {
  routeId: string;
  directionId: string;
  shapeId: string;
  headsign: string;
  shortName: string;
  longName: string;
  color: string;
  coordinates: [number, number][];
  regionId?: string;
  agencyId?: string;
  mode?: TransitMode;
};

export type TransitVehicle = {
  id: string;
  latitude: number;
  longitude: number;
  routeId: string;
  bearing?: number;
  mode?: TransitMode;
  agencyId?: string;
};

export type TimetableTrip = {
  tripId: string;
  serviceId: string;
  stops: [string, number, number][];
};

export type TransitTimetables = Record<string, Record<string, TimetableTrip[]>>;
export type TransitRouteShapes = Record<string, Record<string, string>>;
export type TransitRouteStopSequences = Record<
  string,
  Record<string, string[]>
>;
export type TransitShapes = Record<string, number[][]>;
export type TransitServiceDates = Record<string, string[]>;

export type TransitDatasetMetadata = {
  id: string;
  name: string;
  regionId: string;
  agencyId: string;
  modes: TransitMode[];
};

export type TransitDataset = {
  metadata: TransitDatasetMetadata;
  stops: TransitStop[];
  routes: TransitRoute[];
  timetables: TransitTimetables;
  serviceDates: TransitServiceDates;
  routeShapes: TransitRouteShapes;
  routeStopSequences: TransitRouteStopSequences;
  shapes: TransitShapes;
};
