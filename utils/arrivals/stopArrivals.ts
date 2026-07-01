import { getTransitModeForRoute } from "@/services/transit/transitModes";
import {
  getTransitRoutes,
  getTransitStops,
  getTransitTimetables,
} from "@/services/transit/transitRepository";
import { TransitMode, TransitRoute, TransitStop } from "@/types/transit";
import { isServiceActiveWithOvernight } from "../routing/serviceAvailability";

const SECONDS_IN_DAY = 24 * 60 * 60;

// ─── Configuración backend ────────────────────────────────────────────────────

const API_BASE = __DEV__
  ? "http://192.168.50.10:3000" // IP local en desarrollo — ajusta si cambia
  : "https://tu-servidor.com"; // producción

const REALTIME_TIMEOUT_MS = 4000;

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type StopArrival = {
  routeId: string;
  routeName: string;
  routeColor: string;
  mode: TransitMode;
  destination: string;
  directionId: string;
  departureTimeSeconds: number; // Unix timestamp (realtime) o segundos desde medianoche (teórico)
  scheduledTimeSeconds?: number; // Unix timestamp teórico — solo cuando isRealtime=true
  waitMinutes: number;
  isRealtime: boolean;
  delayMinutes?: number;
};

// Respuesta del endpoint /api/stops/:stopId/arrivals
type RealtimeArrival = {
  tripId: string;
  routeId: string;
  directionId?: string;
  arrival: {
    scheduled: number | null; // Unix timestamp segundos
    delay: number;
    live: number | null;
  };
  departure: {
    scheduled: number | null;
    delay: number;
    live: number | null;
  };
};

// ─── Datos estáticos ──────────────────────────────────────────────────────────

function getCurrentTransitData() {
  return {
    routes: getTransitRoutes() as TransitRoute[],
    stops: getTransitStops() as TransitStop[],
    timetables: getTransitTimetables(),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function secondsSinceStartOfDay(date = new Date()): number {
  return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
}

function unixToSecondsInDay(unixSeconds: number): number {
  // Usar hora local del dispositivo, no UTC
  const d = new Date(unixSeconds * 1000);
  return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
}

/**
 * Formatea segundos-desde-medianoche a "HH:MM".
 * También acepta Unix timestamps (> SECONDS_IN_DAY) convirtiéndolos primero.
 */
export function formatArrivalTime(seconds: number): string {
  // Si parece un Unix timestamp (> 1 día en segundos), convertir a hora local
  if (seconds > SECONDS_IN_DAY) {
    return formatArrivalTime(unixToSecondsInDay(seconds));
  }
  const normalized = ((seconds % SECONDS_IN_DAY) + SECONDS_IN_DAY) % SECONDS_IN_DAY;
  const hours = Math.floor(normalized / 3600);
  const minutes = Math.floor((normalized % 3600) / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

// ─── Tiempo real ──────────────────────────────────────────────────────────────

/**
 * Llama al backend y devuelve los próximos servicios en tiempo real.
 * Devuelve null si no hay red o el backend no responde en REALTIME_TIMEOUT_MS.
 */
async function fetchRealtimeArrivals(
  stopId: string,
  limit: number
): Promise<RealtimeArrival[] | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REALTIME_TIMEOUT_MS);

    const res = await fetch(`${API_BASE}/api/stops/${stopId}/arrivals?limit=${limit}`, {
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) return null;
    const data = await res.json();
    return data.arrivals ?? null;
  } catch {
    return null;
  }
}

/**
 * Convierte una llegada en tiempo real a StopArrival,
 * enriquecida con los datos estáticos de routes.json.
 */
function realtimeToStopArrival(
  arrival: RealtimeArrival,
  nowSeconds: number,
  date: Date
): StopArrival | null {
  const { routes, stops, timetables } = getCurrentTransitData();
  const liveUnix = arrival.departure.live ?? arrival.arrival.live;
  if (liveUnix === null) return null;

  // Descartar si ya ha pasado (60s de margen)
  if (liveUnix < Date.now() / 1000 - 60) return null;

  // departureTimeSeconds guarda el Unix timestamp — formatArrivalTime lo convierte a hora local
  const departureTimeSeconds = liveUnix;
  const waitMinutes = Math.max(0, Math.round((liveUnix - Date.now() / 1000) / 60));
  const delayMinutes = Math.round((arrival.departure.delay ?? arrival.arrival.delay) / 60);

  // Buscar info de ruta filtrando también por directionId para no coger el sentido contrario
  const directionId = arrival.directionId ?? "0";
  const routeInfo =
    routes.find((r) => r.routeId === arrival.routeId && r.directionId === directionId) ??
    routes.find((r) => r.routeId === arrival.routeId);

  // Buscar destino desde el trip concreto en timetables (última parada = destino real)
  let destination = routeInfo?.headsign ?? "Destino";
  if (arrival.tripId) {
    const directions = timetables[arrival.routeId];
    if (directions) {
      outer: for (const [dir, trips] of Object.entries(directions)) {
        for (const trip of trips) {
          if (trip.tripId === arrival.tripId) {
            const lastStopId = trip.stops[trip.stops.length - 1][0];
            // Buscar routeInfo con la dirección exacta del trip
            const tripRouteInfo = routes.find(
              (r) => r.routeId === arrival.routeId && r.directionId === dir
            );
            destination =
              tripRouteInfo?.headsign ?? stops.find((s) => s.id === lastStopId)?.name ?? "Destino";
            break outer;
          }
        }
      }
    }
  }

  return {
    routeId: arrival.routeId,
    routeName: routeInfo?.shortName ?? arrival.routeId,
    routeColor: routeInfo?.color ? `#${routeInfo.color}` : "#9ca3af",
    mode: routeInfo?.mode ?? getTransitModeForRoute(arrival.routeId),
    destination,
    directionId,
    departureTimeSeconds,
    scheduledTimeSeconds: arrival.departure.scheduled ?? undefined,
    waitMinutes,
    isRealtime: true,
    delayMinutes,
  };
}

// ─── Horario teórico (fallback offline) ───────────────────────────────────────

function getTheoreticalArrivals(stopId: string, limit: number, date: Date): StopArrival[] {
  const { routes, stops, timetables } = getCurrentTransitData();
  const nowSeconds = secondsSinceStartOfDay(date);
  const arrivals: StopArrival[] = [];
  const seen = new Set<string>();

  for (const routeId of Object.keys(timetables)) {
    const directions = timetables[routeId];
    for (const directionId of Object.keys(directions)) {
      const trips = directions[directionId];
      const routeInfo = routes.find((r) => r.routeId === routeId && r.directionId === directionId);

      for (const trip of trips) {
        if (!isServiceActiveWithOvernight(trip.serviceId, date)) continue;

        const stopIndex = trip.stops.findIndex(([id]) => id === stopId);
        if (stopIndex === -1) continue;

        const departureSeconds = trip.stops[stopIndex][2];
        let nextDeparture = departureSeconds;
        while (nextDeparture < nowSeconds) nextDeparture += SECONDS_IN_DAY;

        const uniqueKey = `${routeId}-${directionId}-${nextDeparture}`;
        if (seen.has(uniqueKey)) continue;
        seen.add(uniqueKey);

        const lastStopId = trip.stops[trip.stops.length - 1][0];
        const destination =
          routeInfo?.headsign ?? stops.find((s) => s.id === lastStopId)?.name ?? "Destino";

        arrivals.push({
          routeId,
          routeName: routeInfo?.shortName ?? routeId,
          routeColor: routeInfo?.color ? `#${routeInfo.color}` : "#9ca3af",
          mode: routeInfo?.mode ?? getTransitModeForRoute(routeId),
          destination,
          directionId,
          departureTimeSeconds: nextDeparture,
          waitMinutes: Math.max(0, Math.round((nextDeparture - nowSeconds) / 60)),
          isRealtime: false,
        });
      }
    }
  }

  return arrivals.sort((a, b) => a.departureTimeSeconds - b.departureTimeSeconds).slice(0, limit);
}

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Devuelve las próximas llegadas para una parada.
 *
 * 1. Intenta obtener datos en tiempo real del backend.
 * 2. Si no hay respuesta en 4s (sin red, servidor caído…), usa timetables.json.
 *
 * El campo `isRealtime` indica al componente si mostrar un indicador "En vivo".
 */
export async function getNextArrivalsForStop(
  stopId: string,
  limit = 5,
  date = new Date()
): Promise<StopArrival[]> {
  const nowSeconds = secondsSinceStartOfDay(date);

  const realtimeRaw = await fetchRealtimeArrivals(stopId, limit * 2);

  if (realtimeRaw && realtimeRaw.length > 0) {
    const arrivals = realtimeRaw
      .map((a) => realtimeToStopArrival(a, nowSeconds, date))
      .filter((a): a is StopArrival => a !== null)
      .sort((a, b) => a.departureTimeSeconds - b.departureTimeSeconds)
      .slice(0, limit);

    // Si el tiempo real devuelve resultados válidos, los usamos
    if (arrivals.length > 0) return arrivals;
  }

  // Fallback: horario teórico offline
  return getTheoreticalArrivals(stopId, limit, date);
}
