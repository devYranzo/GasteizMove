import routesData from "@/data/gtfs/routes.json";
import stopsData from "@/data/gtfs/stops.json";
import timetablesData from "@/data/gtfs/timetables.json";

import { isServiceActiveWithOvernight } from "../routing/serviceAvailability";

const SECONDS_IN_DAY = 24 * 60 * 60;

type TimetableTrip = {
  tripId: string;
  serviceId: string;
  stops: [string, number, number][];
};

type RouteData = {
  routeId: string;
  directionId: string;
  headsign: string;
  shortName: string;
  longName: string;
  color: string;
};

type StopData = {
  id: string;
  name: string;
};

export type StopArrival = {
  routeId: string;
  routeName: string;
  routeColor: string;
  destination: string;
  directionId: string;
  departureTimeSeconds: number;
  waitMinutes: number;
};

const routes = routesData as RouteData[];

const stops = stopsData as StopData[];

const timetables = timetablesData as Record<string, Record<string, TimetableTrip[]>>;

function secondsSinceStartOfDay(date = new Date()): number {
  return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
}

export function getNextArrivalsForStop(
  stopId: string,
  limit = 10,
  date = new Date()
): StopArrival[] {
  const nowSeconds = secondsSinceStartOfDay(date);

  const arrivals: StopArrival[] = [];

  for (const routeId of Object.keys(timetables)) {
    const directions = timetables[routeId];

    for (const directionId of Object.keys(directions)) {
      const trips = directions[directionId];

      let bestDeparture: number | null = null;
      let bestDestination = "";

      for (const trip of trips) {
        if (!isServiceActiveWithOvernight(trip.serviceId, date)) {
          continue;
        }

        const stopIndex = trip.stops.findIndex(([id]) => id === stopId);

        if (stopIndex === -1) {
          continue;
        }

        const departureSeconds = trip.stops[stopIndex][2];

        let nextDeparture = departureSeconds;

        while (nextDeparture < nowSeconds) {
          nextDeparture += SECONDS_IN_DAY;
        }

        const lastStopId = trip.stops[trip.stops.length - 1][0];

        const destination = stops.find((s) => s.id === lastStopId)?.name ?? "Destino";

        if (bestDeparture === null || nextDeparture < bestDeparture) {
          bestDeparture = nextDeparture;
          bestDestination = destination;
        }
      }

      if (bestDeparture === null) {
        continue;
      }

      const routeInfo = routes.find((r) => r.routeId === routeId && r.directionId === directionId);

      arrivals.push({
        routeId,
        routeName: routeInfo?.shortName ?? routeId,
        routeColor: routeInfo?.color ? `#${routeInfo.color}` : "#9ca3af",
        destination: routeInfo?.headsign ?? bestDestination,
        directionId,
        departureTimeSeconds: bestDeparture,
        waitMinutes: Math.max(0, Math.round((bestDeparture - nowSeconds) / 60)),
      });
    }
  }

  return arrivals.sort((a, b) => a.departureTimeSeconds - b.departureTimeSeconds).slice(0, limit);
}
