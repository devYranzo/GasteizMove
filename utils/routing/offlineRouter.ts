import routeShapes from "@/data/gtfs/route_shapes.json";
import routeStopSequences from "@/data/gtfs/route_stop_sequences.json";
import shapesData from "@/data/gtfs/shapes.json";
import stops from "@/data/gtfs/stops.json";
import timetablesData from "@/data/gtfs/timetables.json";

export type WalkStep = {
  type: "walk";
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  fromName?: string;
  toName?: string;
  distanceMeters?: number;
};

export type BusStep = {
  type: "bus";
  routeId: string;
  directionId: string;
  fromStopId: string;
  toStopId: string;
  fromStopName?: string;
  toStopName?: string;
  shapeCoords: { latitude: number; longitude: number }[];
  stopCount: number;
};

export type RouteStep = WalkStep | BusStep;

export type RouteCandidate = {
  score: number;
  steps: RouteStep[];
};

export type TimedWalkStep = WalkStep & {
  startTimeSeconds: number;
  endTimeSeconds: number;
  durationMinutes: number;
};

export type TimedBusStep = BusStep & {
  readyTimeSeconds: number;
  departureTimeSeconds: number | null;
  arrivalTimeSeconds: number | null;
  waitMinutes: number | null;
  durationMinutes: number;
};

export type TimedRouteStep = TimedWalkStep | TimedBusStep;

export type RouteTiming = {
  steps: TimedRouteStep[];
  departureTimeSeconds: number;
  arrivalTimeSeconds: number;
  totalMinutes: number;
};

// Rutas que NO deben usarse en el router diurno
const EXCLUDED_ROUTE_PREFIXES = ["G"];
// Rutas exprés con cobertura muy limitada — solo usar si hay conexión directa real
const EXPRESS_ROUTES = ["E1", "E7"];

function isNightRoute(routeId: string) {
  return EXCLUDED_ROUTE_PREFIXES.some((p) => routeId.startsWith(p));
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const stopMap: Record<string, (typeof stops)[0]> = {};
for (const s of stops) {
  stopMap[s.id] = s;
}

/**
 * Paradas candidatas para origen/destino: excluye las que solo tienen rutas nocturnas.
 * Ordena por distancia y devuelve las N más cercanas.
 */
function nearestUsableStops(lat: number, lng: number, maxResults = 5) {
  return stops
    .filter((s) => s.routes.some((r) => !isNightRoute(r.id)))
    .map((s) => ({ stop: s, dist: haversine(lat, lng, s.latitude, s.longitude) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, maxResults);
}

function resolveDirection(
  routeId: string,
  fromStopId: string,
  toStopId: string
): { directionId: string; fromIdx: number; toIdx: number } | null {
  const seqs = (routeStopSequences as Record<string, Record<string, string[]>>)[routeId];
  if (!seqs) return null;
  for (const [directionId, stopIds] of Object.entries(seqs)) {
    const fromIdx = stopIds.indexOf(fromStopId);
    const toIdx = stopIds.indexOf(toStopId);
    if (fromIdx !== -1 && toIdx !== -1 && fromIdx < toIdx) {
      return { directionId, fromIdx, toIdx };
    }
  }
  return null;
}

function getShapeSlice(
  routeId: string,
  directionId: string,
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): { latitude: number; longitude: number }[] {
  const shapeId = (routeShapes as Record<string, Record<string, string>>)[routeId]?.[directionId];
  if (!shapeId) return [];
  const pts = (shapesData as Record<string, number[][]>)[shapeId] ?? [];
  if (!pts.length) return [];

  let fromClosestIdx = 0;
  let toClosestIdx = 0;
  let fromMinDist = Infinity;
  let toMinDist = Infinity;

  for (let i = 0; i < pts.length; i++) {
    const [lat, lng] = pts[i];
    const dFrom = haversine(fromLat, fromLng, lat, lng);
    const dTo = haversine(toLat, toLng, lat, lng);
    if (dFrom < fromMinDist) {
      fromMinDist = dFrom;
      fromClosestIdx = i;
    }
    if (dTo < toMinDist) {
      toMinDist = dTo;
      toClosestIdx = i;
    }
  }

  const startIdx = Math.min(fromClosestIdx, toClosestIdx);
  const endIdx = Math.max(fromClosestIdx, toClosestIdx);
  return pts.slice(startIdx, endIdx + 1).map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
}

function buildBusStep(
  routeId: string,
  fromStopId: string,
  toStopId: string,
  directionId: string,
  fromIdx: number,
  toIdx: number
): BusStep {
  const fromStop = stopMap[fromStopId];
  const toStop = stopMap[toStopId];
  const shapeCoords = getShapeSlice(
    routeId,
    directionId,
    fromStop?.latitude ?? 0,
    fromStop?.longitude ?? 0,
    toStop?.latitude ?? 0,
    toStop?.longitude ?? 0
  );
  return {
    type: "bus",
    routeId,
    directionId,
    fromStopId,
    toStopId,
    fromStopName: fromStop?.name,
    toStopName: toStop?.name,
    shapeCoords,
    stopCount: toIdx - fromIdx,
  };
}

/**
 * Dado un conjunto de routeIds de una parada, devuelve solo los diurnos
 * ordenando primero los no-exprés (más cobertura).
 */
function usableRoutes(routeIds: Set<string>, preferMain = true): string[] {
  const filtered = [...routeIds].filter((r) => !isNightRoute(r));
  if (!preferMain) return filtered;
  // Líneas principales primero, exprés al final
  return [
    ...filtered.filter((r) => !EXPRESS_ROUTES.includes(r)),
    ...filtered.filter((r) => EXPRESS_ROUTES.includes(r)),
  ];
}

export function findRoute(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): RouteCandidate[] {
  const directDist = haversine(originLat, originLng, destLat, destLng);

  // Distancia a pie directa
  if (directDist < 400) {
    return [
      {
        score: directDist,
        steps: [
          {
            type: "walk",
            fromLat: originLat,
            fromLng: originLng,
            toLat: destLat,
            toLng: destLng,
            distanceMeters: directDist,
          },
        ],
      },
    ];
  }

  // Candidatos de parada origen y destino
  const originCandidates = nearestUsableStops(originLat, originLng, 8);
  const destCandidates = nearestUsableStops(destLat, destLng, 8);

  const candidates: RouteCandidate[] = [];

  // ─── DIRECTO ────────────────────────────────────────────────────────────────
  for (const { stop: oStop } of originCandidates) {
    const oRoutes = usableRoutes(new Set(oStop.routes.map((r) => r.id)));
    for (const { stop: dStop } of destCandidates) {
      const dRouteIds = new Set(dStop.routes.map((r) => r.id));
      for (const routeId of oRoutes) {
        if (!dRouteIds.has(routeId)) continue;
        const dir = resolveDirection(routeId, oStop.id, dStop.id);
        if (!dir) continue;

        const walkToBus = haversine(originLat, originLng, oStop.latitude, oStop.longitude);

        const walkFromBus = haversine(dStop.latitude, dStop.longitude, destLat, destLng);

        const stopPenalty = (dir.toIdx - dir.fromIdx) * 40;

        candidates.push({
          score: walkToBus + walkFromBus + stopPenalty,
          steps: [
            {
              type: "walk",
              fromLat: originLat,
              fromLng: originLng,
              toLat: oStop.latitude,
              toLng: oStop.longitude,
              toName: oStop.name,
              distanceMeters: walkToBus,
            },
            buildBusStep(routeId, oStop.id, dStop.id, dir.directionId, dir.fromIdx, dir.toIdx),
            {
              type: "walk",
              fromLat: dStop.latitude,
              fromLng: dStop.longitude,
              fromName: dStop.name,
              toLat: destLat,
              toLng: destLng,
              distanceMeters: walkFromBus,
            },
          ],
        });
      }
    }
  }

  // ─── 1 TRANSBORDO ───────────────────────────────────────────────────────────
  // Paradas de transbordo: excluye nocturnas, ordena por cercanía al punto medio,
  // penaliza las que estén más lejos del eje origen-destino
  const midLat = (originLat + destLat) / 2;
  const midLng = (originLng + destLng) / 2;

  const transferCandidates = stops
    .filter((s) => {
      // Debe tener al menos una ruta diurna
      return s.routes.some((r) => !isNightRoute(r.id));
    })
    .map((s) => ({
      stop: s,
      dist: haversine(midLat, midLng, s.latitude, s.longitude),
    }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 60)
    .map((x) => x.stop);

  for (const { stop: oStop } of originCandidates) {
    const oRoutes = usableRoutes(new Set(oStop.routes.map((r) => r.id)));

    for (const transferStop of transferCandidates) {
      if (transferStop.id === oStop.id) continue;
      const tRoutes = usableRoutes(new Set(transferStop.routes.map((r) => r.id)), false);

      // Primer tramo: origen -> transbordo (solo rutas principales, no exprés)
      let firstRouteId: string | null = null;
      let firstDir: { directionId: string; fromIdx: number; toIdx: number } | null = null;
      for (const routeId of oRoutes.filter((r) => !EXPRESS_ROUTES.includes(r))) {
        if (!tRoutes.includes(routeId)) continue;
        const dir = resolveDirection(routeId, oStop.id, transferStop.id);
        if (dir) {
          firstRouteId = routeId;
          firstDir = dir;
          break;
        }
      }
      if (!firstRouteId || !firstDir) continue;

      // Segundo tramo: transbordo -> destino
      for (const { stop: dStop } of destCandidates) {
        const dRouteIds = new Set(dStop.routes.map((r) => r.id));
        let secondRouteId: string | null = null;
        let secondDir: { directionId: string; fromIdx: number; toIdx: number } | null = null;
        for (const routeId of tRoutes) {
          if (!dRouteIds.has(routeId)) continue;
          if (routeId === firstRouteId) continue; // evitar misma ruta en transbordo inútil
          const dir = resolveDirection(routeId, transferStop.id, dStop.id);
          if (dir) {
            secondRouteId = routeId;
            secondDir = dir;
            break;
          }
        }
        if (!secondRouteId || !secondDir) continue;

        const walkToBus = haversine(originLat, originLng, oStop.latitude, oStop.longitude);

        const walkFromBus = haversine(dStop.latitude, dStop.longitude, destLat, destLng);

        const transferPenalty = 500;

        const stopPenalty =
          (firstDir.toIdx - firstDir.fromIdx) * 40 + (secondDir.toIdx - secondDir.fromIdx) * 40;

        candidates.push({
          score: walkToBus + walkFromBus + transferPenalty + stopPenalty,
          steps: [
            {
              type: "walk",
              fromLat: originLat,
              fromLng: originLng,
              toLat: oStop.latitude,
              toLng: oStop.longitude,
              toName: oStop.name,
              distanceMeters: walkToBus,
            },
            buildBusStep(
              firstRouteId,
              oStop.id,
              transferStop.id,
              firstDir.directionId,
              firstDir.fromIdx,
              firstDir.toIdx
            ),
            {
              type: "walk",
              fromLat: transferStop.latitude,
              fromLng: transferStop.longitude,
              fromName: transferStop.name,
              toLat: transferStop.latitude,
              toLng: transferStop.longitude,
              toName: transferStop.name,
              distanceMeters: 0,
            },
            buildBusStep(
              secondRouteId,
              transferStop.id,
              dStop.id,
              secondDir.directionId,
              secondDir.fromIdx,
              secondDir.toIdx
            ),
            {
              type: "walk",
              fromLat: dStop.latitude,
              fromLng: dStop.longitude,
              fromName: dStop.name,
              toLat: destLat,
              toLng: destLng,
              distanceMeters: walkFromBus,
            },
          ],
        });
      }
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => a.score - b.score);

    return candidates;
  }

  // Fallback: walk directo
  return [
    {
      score: directDist,
      steps: [
        {
          type: "walk",
          fromLat: originLat,
          fromLng: originLng,
          toLat: destLat,
          toLng: destLng,
          distanceMeters: directDist,
        },
      ],
    },
  ];
}

const WALK_SPEED_M_S = 1.35;
const BUS_STOP_TIME_S = 70;
const SECONDS_IN_DAY = 24 * 60 * 60;

type TimetableTrip = {
  tripId: string;
  stops: [string, number, number][];
};

const timetables = timetablesData as Record<string, Record<string, TimetableTrip[]>>;

export function estimateRouteMinutes(candidate: RouteCandidate): number {
  let seconds = 0;

  for (const step of candidate.steps) {
    if (step.type === "walk") {
      seconds += (step.distanceMeters ?? 0) / WALK_SPEED_M_S;
    } else {
      seconds += step.stopCount * BUS_STOP_TIME_S;
    }
  }

  return Math.round(seconds / 60);
}

export function countTransfers(candidate: RouteCandidate): number {
  return candidate.steps.filter((step) => step.type === "bus").length - 1;
}

export function secondsSinceStartOfDay(date = new Date()) {
  return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
}

export function formatRouteTime(seconds: number | null) {
  if (seconds === null) return "--:--";

  const normalized = ((seconds % SECONDS_IN_DAY) + SECONDS_IN_DAY) % SECONDS_IN_DAY;
  const hours = Math.floor(normalized / 3600);
  const minutes = Math.floor((normalized % 3600) / 60);

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function findNextBusTiming(step: BusStep, readyTimeSeconds: number) {
  const trips = timetables[step.routeId]?.[step.directionId] ?? [];
  let bestTiming: { departureTimeSeconds: number; arrivalTimeSeconds: number } | null = null;

  for (const trip of trips) {
    const fromIndex = trip.stops.findIndex(([stopId]) => stopId === step.fromStopId);
    if (fromIndex === -1) continue;

    const toIndex = trip.stops.findIndex(([stopId], index) => {
      return index > fromIndex && stopId === step.toStopId;
    });
    if (toIndex === -1) continue;

    const fromStop = trip.stops[fromIndex];
    const toStop = trip.stops[toIndex];

    let departureTimeSeconds = fromStop[2];
    while (departureTimeSeconds < readyTimeSeconds) {
      departureTimeSeconds += SECONDS_IN_DAY;
    }

    let arrivalTimeSeconds = toStop[1] + (departureTimeSeconds - fromStop[2]);
    if (arrivalTimeSeconds < departureTimeSeconds) {
      arrivalTimeSeconds += SECONDS_IN_DAY;
    }

    const timing = {
      departureTimeSeconds,
      arrivalTimeSeconds,
    };

    if (!bestTiming || timing.departureTimeSeconds < bestTiming.departureTimeSeconds) {
      bestTiming = timing;
    }
  }

  return bestTiming;
}

export function getRouteTiming(candidate: RouteCandidate, startDate = new Date()): RouteTiming {
  const departureTimeSeconds = secondsSinceStartOfDay(startDate);
  let currentTimeSeconds = departureTimeSeconds;

  const steps = candidate.steps.map((step): TimedRouteStep => {
    if (step.type === "walk") {
      const durationSeconds = Math.round((step.distanceMeters ?? 0) / WALK_SPEED_M_S);
      const startTimeSeconds = currentTimeSeconds;
      const endTimeSeconds = currentTimeSeconds + durationSeconds;
      currentTimeSeconds = endTimeSeconds;

      return {
        ...step,
        startTimeSeconds,
        endTimeSeconds,
        durationMinutes: Math.round(durationSeconds / 60),
      };
    }

    const readyTimeSeconds = currentTimeSeconds;
    const scheduledTiming = findNextBusTiming(step, readyTimeSeconds);

    if (scheduledTiming) {
      const durationSeconds =
        scheduledTiming.arrivalTimeSeconds - scheduledTiming.departureTimeSeconds;
      currentTimeSeconds = scheduledTiming.arrivalTimeSeconds;

      return {
        ...step,
        readyTimeSeconds,
        departureTimeSeconds: scheduledTiming.departureTimeSeconds,
        arrivalTimeSeconds: scheduledTiming.arrivalTimeSeconds,
        waitMinutes: Math.max(
          0,
          Math.round((scheduledTiming.departureTimeSeconds - readyTimeSeconds) / 60)
        ),
        durationMinutes: Math.max(1, Math.round(durationSeconds / 60)),
      };
    }

    const fallbackDurationSeconds = step.stopCount * BUS_STOP_TIME_S;
    currentTimeSeconds += fallbackDurationSeconds;

    return {
      ...step,
      readyTimeSeconds,
      departureTimeSeconds: null,
      arrivalTimeSeconds: null,
      waitMinutes: null,
      durationMinutes: Math.max(1, Math.round(fallbackDurationSeconds / 60)),
    };
  });

  return {
    steps,
    departureTimeSeconds,
    arrivalTimeSeconds: currentTimeSeconds,
    totalMinutes: Math.max(0, Math.round((currentTimeSeconds - departureTimeSeconds) / 60)),
  };
}
