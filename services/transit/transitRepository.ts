import { staticTransitDataset } from "./staticTransitDataset";
import { getTransitModeForRoute } from "./transitModes";
import type {
  TransitDataset,
  TransitDatasetMetadata,
  TransitRoute,
  TransitStop,
  TransitTimetables,
  TransitRouteShapes,
  TransitRouteStopSequences,
  TransitShapes,
  TransitServiceDates,
} from "@/types/transit";

const API_BASE =
  typeof globalThis !== "undefined" && process.env.NODE_ENV !== "production"
    ? "http://192.168.50.10:3000"
    : "https://tu-servidor.com";

let activeTransitDataset: TransitDataset = staticTransitDataset;
let activeRegionId = "vitoria-gasteiz";

export function resolveTransitRegionId(
  latitude: number,
  longitude: number,
  fallbackRegionId = "vitoria-gasteiz",
): string {
  if (latitude >= 42.8 && latitude <= 43.4 && longitude >= -3.2 && longitude <= -2.0) {
    return "vitoria-gasteiz";
  }

  if (latitude >= 42.9 && latitude <= 43.4 && longitude >= -3.0 && longitude <= -2.7) {
    return "bilbao";
  }

  if (latitude >= 43.0 && latitude <= 43.4 && longitude >= -2.2 && longitude <= -1.8) {
    return "donostia";
  }

  return fallbackRegionId;
}

function buildDefaultTransitDataset(): TransitDataset {
  return staticTransitDataset;
}

function createMetadataWithDefaults(
  metadata: Partial<TransitDatasetMetadata> | undefined,
  fallbackRegionId: string,
): TransitDatasetMetadata {
  const fallback = buildDefaultTransitDataset().metadata;
  return {
    id: metadata?.id ?? fallback.id,
    name: metadata?.name ?? fallback.name,
    regionId: metadata?.regionId ?? fallbackRegionId,
    agencyId: metadata?.agencyId ?? fallback.agencyId,
    modes: metadata?.modes ?? fallback.modes,
  };
}

function normalizeRoute(
  route: Partial<TransitRoute> & { routeId: string },
  fallbackRegionId: string,
  fallbackAgencyId: string,
): TransitRoute {
  const defaultRoute = buildDefaultTransitDataset().routes.find(
    (candidate) => candidate.routeId === route.routeId,
  );

  return {
    routeId: route.routeId,
    directionId: route.directionId ?? defaultRoute?.directionId ?? "0",
    shapeId: route.shapeId ?? defaultRoute?.shapeId ?? route.routeId,
    headsign: route.headsign ?? defaultRoute?.headsign ?? route.routeId,
    shortName: route.shortName ?? defaultRoute?.shortName ?? route.routeId,
    longName: route.longName ?? defaultRoute?.longName ?? route.routeId,
    color: route.color ?? defaultRoute?.color ?? "2563EB",
    coordinates:
      route.coordinates ?? defaultRoute?.coordinates ?? [],
    regionId: route.regionId ?? fallbackRegionId,
    agencyId: route.agencyId ?? fallbackAgencyId,
    mode: route.mode ?? defaultRoute?.mode ?? getTransitModeForRoute(route.routeId),
  };
}

function normalizeStop(
  stop: Partial<TransitStop> & { id: string },
  fallbackRegionId: string,
  fallbackAgencyId: string,
): TransitStop {
  const defaultStop = buildDefaultTransitDataset().stops.find(
    (candidate) => candidate.id === stop.id,
  );

  return {
    id: stop.id,
    name: stop.name ?? defaultStop?.name ?? stop.id,
    latitude: stop.latitude ?? defaultStop?.latitude ?? 0,
    longitude: stop.longitude ?? defaultStop?.longitude ?? 0,
    routes: stop.routes ?? defaultStop?.routes ?? [],
    regionId: stop.regionId ?? fallbackRegionId,
    agencyId: stop.agencyId ?? fallbackAgencyId,
    modes: stop.modes ?? defaultStop?.modes ?? [],
  };
}

export function normalizeTransitDatasetPayload(
  payload: Partial<TransitDataset> | Record<string, unknown>,
  fallbackRegionId: string,
): TransitDataset {
  const fallbackDataset = buildDefaultTransitDataset();
  const metadata = createMetadataWithDefaults(
    (payload.metadata as Partial<TransitDatasetMetadata> | undefined) ?? undefined,
    fallbackRegionId,
  );

  const routes = Array.isArray(payload.routes)
    ? (payload.routes as Array<Partial<TransitRoute> & { routeId: string }>).map((route) =>
        normalizeRoute(route, fallbackRegionId, metadata.agencyId),
      )
    : fallbackDataset.routes;

  const stops = Array.isArray(payload.stops)
    ? (payload.stops as Array<Partial<TransitStop> & { id: string }>).map((stop) =>
        normalizeStop(stop, fallbackRegionId, metadata.agencyId),
      )
    : fallbackDataset.stops;

  const timetables =
    (payload.timetables as TransitTimetables | undefined) ??
    fallbackDataset.timetables;
  const serviceDates =
    (payload.serviceDates as TransitServiceDates | undefined) ??
    fallbackDataset.serviceDates;
  const routeShapes =
    (payload.routeShapes as TransitRouteShapes | undefined) ??
    fallbackDataset.routeShapes;
  const routeStopSequences =
    (payload.routeStopSequences as TransitRouteStopSequences | undefined) ??
    fallbackDataset.routeStopSequences;
  const shapes = (payload.shapes as TransitShapes | undefined) ?? fallbackDataset.shapes;

  return {
    metadata,
    stops,
    routes,
    timetables,
    serviceDates,
    routeShapes,
    routeStopSequences,
    shapes,
  };
}

async function fetchTransitDatasetForRegion(regionId: string): Promise<TransitDataset | null> {
  try {
    const res = await fetch(`${API_BASE}/api/regions/${regionId}/transit`);
    if (!res.ok) return null;
    const payload = await res.json();
    return normalizeTransitDatasetPayload(payload, regionId);
  } catch {
    return null;
  }
}

export function getTransitDataset(regionId = activeRegionId): TransitDataset {
  return regionId === activeRegionId ? activeTransitDataset : buildDefaultTransitDataset();
}

export async function loadTransitDataset(regionId = activeRegionId): Promise<TransitDataset> {
  const resolvedRegionId = regionId || activeRegionId;
  const remoteDataset = await fetchTransitDatasetForRegion(resolvedRegionId);
  const dataset = remoteDataset ?? buildDefaultTransitDataset();

  activeTransitDataset = dataset;
  activeRegionId = resolvedRegionId;
  return dataset;
}

export function getTransitStops(regionId?: string) {
  return getTransitDataset(regionId).stops;
}

export function getTransitRoutes(regionId?: string) {
  return getTransitDataset(regionId).routes;
}

export function getTransitTimetables(regionId?: string) {
  return getTransitDataset(regionId).timetables;
}

export function getTransitServiceDates(regionId?: string) {
  return getTransitDataset(regionId).serviceDates;
}

export function getTransitRouteShapes(regionId?: string) {
  return getTransitDataset(regionId).routeShapes;
}

export function getTransitRouteStopSequences(regionId?: string) {
  return getTransitDataset(regionId).routeStopSequences;
}

export function getTransitShapes(regionId?: string) {
  return getTransitDataset(regionId).shapes;
}

export function getTransitRouteColorMap(regionId?: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const route of getTransitRoutes(regionId)) {
    map[route.routeId] = `#${route.color ?? "2563EB"}`;
  }
  return map;
}
