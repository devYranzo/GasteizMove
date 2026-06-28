import routeShapes from "@/data/gtfs/route_shapes.json";
import routeStopSequences from "@/data/gtfs/route_stop_sequences.json";
import shapesData from "@/data/gtfs/shapes.json";
import stops from "@/data/gtfs/stops.json";
import timetablesData from "@/data/gtfs/timetables.json";
import { isServiceActiveWithOvernight, isServiceAvailable } from "./serviceAvailability";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE MODOS DE TRANSPORTE
// Para añadir un nuevo modo (ej: tranvía), basta con añadir una entrada aquí.
// El router no necesita ningún otro cambio.
// ─────────────────────────────────────────────────────────────────────────────

export type VehicleType = "bus" | "tram" | "night_bus";
// Cuando añadas tranvía: añade "tram" y su configuración abajo.

type RouteMode = {
  /** Tipo de vehículo que se mostrará en la UI */
  vehicle: VehicleType;
  /**
   * Prefijos de routeId que pertenecen a este modo.
   * Ej: ["G"] para autobuses nocturnos, ["T"] para tranvía.
   */
  routePrefixes: string[];
  /**
   * Si está definido, este modo solo está activo cuando el serviceId
   * correspondiente está disponible en la fecha dada (con lógica overnight).
   * Si es undefined, el modo está siempre activo.
   */
  nightServiceId?: string;
  /**
   * Penalización por parada en segundos equivalentes para el scoring.
   * Menor = más rápido = se prefiere sobre otros modos.
   */
  stopPenaltySeconds: number;
  /**
   * Si true, este modo no se usa como primer tramo en transbordos
   * (rutas exprés o de cobertura limitada).
   */
  expressOnly?: boolean;
};

const ROUTE_MODES: RouteMode[] = [
  {
    vehicle: "bus",
    routePrefixes: [], // rutas sin prefijo especial = bus diurno normal
    stopPenaltySeconds: 40,
  },
  {
    vehicle: "night_bus",
    routePrefixes: ["G"],
    nightServiceId: "Gautxori", // solo activo en madrugadas de fin de semana
    stopPenaltySeconds: 40,
  },
  // ── Ejemplo: cuando tengas tranvía, descomenta y ajusta: ──────────────────
  // {
  //   vehicle: "tram",
  //   routePrefixes: ["T"],
  //   stopPenaltySeconds: 25, // más rápido que el bus
  // },
  // ─────────────────────────────────────────────────────────────────────────
];

/** Rutas que solo deben usarse si hay conexión directa real (no como primer tramo de transbordo) */
const EXPRESS_ROUTE_IDS = ["E1", "E7"];

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

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

export type TransitStep = {
  type: "transit";
  vehicle: VehicleType;
  routeId: string;
  directionId: string;
  fromStopId: string;
  toStopId: string;
  fromStopName?: string;
  toStopName?: string;
  shapeCoords: { latitude: number; longitude: number }[];
  stopCount: number;
};

export type RouteStep = WalkStep | TransitStep;

export type RouteCandidate = {
  score: number;
  steps: RouteStep[];
};

export type TimedWalkStep = WalkStep & {
  startTimeSeconds: number;
  endTimeSeconds: number;
  durationMinutes: number;
};

export type TimedTransitStep = TransitStep & {
  readyTimeSeconds: number;
  departureTimeSeconds: number | null;
  arrivalTimeSeconds: number | null;
  waitMinutes: number | null;
  durationMinutes: number;
};

export type TimedRouteStep = TimedWalkStep | TimedTransitStep;

export type RouteTiming = {
  steps: TimedRouteStep[];
  departureTimeSeconds: number;
  arrivalTimeSeconds: number;
  totalMinutes: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS DE CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dado un routeId, devuelve el RouteMode al que pertenece.
 * Si no coincide ningún prefijo especial, devuelve el modo "bus" base.
 */
function getModeForRoute(routeId: string): RouteMode {
  for (const mode of ROUTE_MODES) {
    if (mode.routePrefixes.some((prefix) => routeId.startsWith(prefix))) {
      return mode;
    }
  }
  // Fallback al primer modo sin prefijos (bus diurno)
  return ROUTE_MODES.find((m) => m.routePrefixes.length === 0) ?? ROUTE_MODES[0];
}

/**
 * Devuelve true si el modo está disponible en la fecha dada.
 */
function isModeActive(mode: RouteMode, date: Date): boolean {
  if (!mode.nightServiceId) return true; // siempre activo
  return isServiceActiveWithOvernight(mode.nightServiceId, date);
}

/**
 * Devuelve true si el routeId está disponible en la fecha dada.
 * Solo comprueba el día (service_dates), no la hora.
 * Para filtrar por hora usa getWaitSeconds().
 */
function isRouteActive(routeId: string, date: Date): boolean {
  return isModeActive(getModeForRoute(routeId), date);
}

/**
 * Devuelve la penalización por parada para un routeId concreto.
 */
function getStopPenalty(routeId: string): number {
  return getModeForRoute(routeId).stopPenaltySeconds;
}

/**
 * Devuelve los segundos de espera hasta el próximo bus de `routeId` en `stopId`.
 * Devuelve null si no hay servicio en las próximas MAX_WAIT_SECONDS (ruta descartable).
 *
 * Se llama una sola vez por candidato durante findRoute para incluir
 * la espera real en el score y descartar rutas sin servicio inmediato.
 */
function getWaitSeconds(routeId: string, stopId: string, date: Date): number | null {
  // getNextDepartureSeconds se define más abajo junto al resto de helpers de timing,
  // pero en JS/TS las funciones declaradas con `function` se elevan (hoisting),
  // así que podemos llamarla aquí sin problema.
  const readyTime = secondsSinceStartOfDay(date);
  const next = getNextDepartureSeconds(routeId, stopId, readyTime, date);
  if (next === null) return null;
  const wait = next - readyTime;
  if (wait > MAX_WAIT_SECONDS) return null; // demasiado tiempo, descartamos
  return wait;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────────────────────────────────────

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

// ─────────────────────────────────────────────────────────────────────────────
// PARADAS Y RUTAS CANDIDATAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Paradas candidatas para origen/destino.
 * Solo incluye paradas con al menos una ruta activa en la fecha dada.
 */
function nearestUsableStops(lat: number, lng: number, maxResults = 5, date: Date = new Date()) {
  return stops
    .filter((s) => s.routes.some((r) => isRouteActive(r.id, date)))
    .map((s) => ({ stop: s, dist: haversine(lat, lng, s.latitude, s.longitude) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, maxResults);
}

/**
 * Filtra y ordena los routeIds utilizables de una parada según la fecha.
 * Si preferMain=true, pone las rutas exprés al final.
 */
function usableRoutes(routeIds: Set<string>, preferMain = true, date: Date = new Date()): string[] {
  const filtered = [...routeIds].filter((r) => isRouteActive(r, date));
  if (!preferMain) return filtered;
  return [
    ...filtered.filter((r) => !EXPRESS_ROUTE_IDS.includes(r)),
    ...filtered.filter((r) => EXPRESS_ROUTE_IDS.includes(r)),
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTRUCCIÓN DE PASOS
// ─────────────────────────────────────────────────────────────────────────────

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

function buildTransitStep(
  routeId: string,
  fromStopId: string,
  toStopId: string,
  directionId: string,
  fromIdx: number,
  toIdx: number
): TransitStep {
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
    type: "transit",
    vehicle: getModeForRoute(routeId).vehicle,
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

// ─────────────────────────────────────────────────────────────────────────────
// ROUTER PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export function findRoute(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  date: Date = new Date()
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

  const originCandidates = nearestUsableStops(originLat, originLng, 8, date);
  const destCandidates = nearestUsableStops(destLat, destLng, 8, date);

  const candidates: RouteCandidate[] = [];

  // ─── DIRECTO ──────────────────────────────────────────────────────────────
  for (const { stop: oStop } of originCandidates) {
    const oRoutes = usableRoutes(new Set(oStop.routes.map((r) => r.id)), true, date);
    for (const { stop: dStop } of destCandidates) {
      const dRouteIds = new Set(dStop.routes.map((r) => r.id));
      for (const routeId of oRoutes) {
        if (!dRouteIds.has(routeId)) continue;
        const dir = resolveDirection(routeId, oStop.id, dStop.id);
        if (!dir) continue;

        // Descartar si el próximo bus tarda más de MAX_WAIT_SECONDS
        const waitSeconds = getWaitSeconds(routeId, oStop.id, date);
        if (waitSeconds === null) continue;

        const walkToBus = haversine(originLat, originLng, oStop.latitude, oStop.longitude);
        const walkFromBus = haversine(dStop.latitude, dStop.longitude, destLat, destLng);
        const stopPenalty = (dir.toIdx - dir.fromIdx) * getStopPenalty(routeId);

        candidates.push({
          score: walkToBus + walkFromBus + stopPenalty + waitSeconds,
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
            buildTransitStep(routeId, oStop.id, dStop.id, dir.directionId, dir.fromIdx, dir.toIdx),
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

  // ─── 1 TRANSBORDO ─────────────────────────────────────────────────────────
  const midLat = (originLat + destLat) / 2;
  const midLng = (originLng + destLng) / 2;

  const transferCandidates = stops
    .filter((s) => s.routes.some((r) => isRouteActive(r.id, date)))
    .map((s) => ({ stop: s, dist: haversine(midLat, midLng, s.latitude, s.longitude) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 60)
    .map((x) => x.stop);

  for (const { stop: oStop } of originCandidates) {
    const oRoutes = usableRoutes(new Set(oStop.routes.map((r) => r.id)), true, date);

    for (const transferStop of transferCandidates) {
      if (transferStop.id === oStop.id) continue;
      const tRoutes = usableRoutes(new Set(transferStop.routes.map((r) => r.id)), false, date);

      // Primer tramo: origen -> transbordo (sin rutas exprés)
      let firstRouteId: string | null = null;
      let firstDir: { directionId: string; fromIdx: number; toIdx: number } | null = null;
      let firstWaitSeconds = 0;
      for (const routeId of oRoutes.filter((r) => !EXPRESS_ROUTE_IDS.includes(r))) {
        if (!tRoutes.includes(routeId)) continue;
        const dir = resolveDirection(routeId, oStop.id, transferStop.id);
        if (!dir) continue;
        const wait = getWaitSeconds(routeId, oStop.id, date);
        if (wait === null) continue; // sin servicio en la hora actual
        firstRouteId = routeId;
        firstDir = dir;
        firstWaitSeconds = wait;
        break;
      }
      if (!firstRouteId || !firstDir) continue;

      // Segundo tramo: transbordo -> destino
      for (const { stop: dStop } of destCandidates) {
        const dRouteIds = new Set(dStop.routes.map((r) => r.id));
        let secondRouteId: string | null = null;
        let secondDir: { directionId: string; fromIdx: number; toIdx: number } | null = null;
        let secondWaitSeconds = 0;
        for (const routeId of tRoutes) {
          if (!dRouteIds.has(routeId)) continue;
          if (routeId === firstRouteId) continue;
          const dir = resolveDirection(routeId, transferStop.id, dStop.id);
          if (!dir) continue;
          const wait = getWaitSeconds(routeId, transferStop.id, date);
          if (wait === null) continue; // sin servicio en la hora actual
          secondRouteId = routeId;
          secondDir = dir;
          secondWaitSeconds = wait;
          break;
        }
        if (!secondRouteId || !secondDir) continue;

        const walkToBus = haversine(originLat, originLng, oStop.latitude, oStop.longitude);
        const walkFromBus = haversine(dStop.latitude, dStop.longitude, destLat, destLng);
        const transferPenalty = 500;
        const stopPenalty =
          (firstDir.toIdx - firstDir.fromIdx) * getStopPenalty(firstRouteId) +
          (secondDir.toIdx - secondDir.fromIdx) * getStopPenalty(secondRouteId);

        candidates.push({
          score:
            walkToBus +
            walkFromBus +
            transferPenalty +
            stopPenalty +
            firstWaitSeconds +
            secondWaitSeconds,
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
            buildTransitStep(
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
            buildTransitStep(
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

// ─────────────────────────────────────────────────────────────────────────────
// TIMING
// ─────────────────────────────────────────────────────────────────────────────

const WALK_SPEED_M_S = 1.35;
const BUS_STOP_TIME_S = 70;
const SECONDS_IN_DAY = 24 * 60 * 60;

/**
 * Si el próximo bus de una ruta en una parada tarda más de este umbral,
 * la ruta se descarta como candidata durante la búsqueda.
 */
const MAX_WAIT_SECONDS = 60 * 60; // 60 minutos

type TimetableTrip = {
  tripId: string;
  serviceId: string;
  stops: [string, number, number][];
};

const timetables = timetablesData as Record<string, Record<string, TimetableTrip[]>>;

/**
 * Devuelve los segundos desde inicio de día hasta el próximo servicio real
 * de `routeId` en `stopId` a partir de `readyTimeSeconds`.
 * Devuelve null si no hay ningún servicio disponible en la fecha dada.
 *
 * Esta función se llama durante findRoute para descartar rutas sin servicio
 * en la hora actual (ej: bus nocturno a las 14:00).
 */
function getNextDepartureSeconds(
  routeId: string,
  stopId: string,
  readyTimeSeconds: number,
  date: Date
): number | null {
  const routeDirections = timetables[routeId];
  if (!routeDirections) return null;

  let earliest: number | null = null;

  for (const trips of Object.values(routeDirections)) {
    for (const trip of trips) {
      if (!isServiceAvailable(trip.serviceId, date)) continue;

      const stopEntry = trip.stops.find(([sid]) => sid === stopId);
      if (!stopEntry) continue;

      // stopEntry[2] = scheduled departure seconds since midnight
      let dep = stopEntry[2];
      // Si el departure ya pasó, buscamos la misma frecuencia al día siguiente
      // (no aplica: los horarios no se repiten al día siguiente automáticamente,
      //  solo avanzamos dentro del mismo bloque de horarios extendidos)
      if (dep < readyTimeSeconds) continue;

      if (earliest === null || dep < earliest) earliest = dep;
    }
  }

  return earliest;
}

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
  return candidate.steps.filter((step) => step.type === "transit").length - 1;
}

export function secondsSinceStartOfDay(date = new Date()): number {
  return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
}

export function formatRouteTime(seconds: number | null): string {
  if (seconds === null) return "--:--";
  const normalized = ((seconds % SECONDS_IN_DAY) + SECONDS_IN_DAY) % SECONDS_IN_DAY;
  const hours = Math.floor(normalized / 3600);
  const minutes = Math.floor((normalized % 3600) / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function findNextBusTiming(step: TransitStep, readyTimeSeconds: number, date: Date = new Date()) {
  const trips = timetables[step.routeId]?.[step.directionId] ?? [];
  let bestTiming: { departureTimeSeconds: number; arrivalTimeSeconds: number } | null = null;

  for (const trip of trips) {
    if (!isServiceAvailable(trip.serviceId, date)) continue;

    const fromIndex = trip.stops.findIndex(([stopId]) => stopId === step.fromStopId);
    if (fromIndex === -1) continue;

    const toIndex = trip.stops.findIndex(
      ([stopId], index) => index > fromIndex && stopId === step.toStopId
    );
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

    const timing = { departureTimeSeconds, arrivalTimeSeconds };
    if (!bestTiming || timing.departureTimeSeconds < bestTiming.departureTimeSeconds) {
      bestTiming = timing;
    }
  }

  return bestTiming;
}

export function getRouteTiming(
  candidate: RouteCandidate,
  startDate: Date = new Date()
): RouteTiming {
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
    const scheduledTiming = findNextBusTiming(step, readyTimeSeconds, startDate);

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
