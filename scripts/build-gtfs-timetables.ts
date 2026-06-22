import { parse } from "csv-parse/sync";
import fs from "fs/promises";
import path from "path";

type TripRow = {
  route_id: string;
  trip_id: string;
  direction_id: string;
  service_id: string;
};

type StopTimeRow = {
  trip_id: string;
  stop_id: string;
  arrival_time: string;
  departure_time: string;
  stop_sequence: string;
};

type TimetableTrip = {
  tripId: string;
  serviceId: string;
  stops: [string, number, number][];
};

type Timetables = Record<string, Record<string, TimetableTrip[]>>;

const GTFS_DIR = path.join(process.cwd(), "gtfs", "tuvisa");
const OUTPUT_DIR = path.join(process.cwd(), "data", "gtfs");

async function loadCsv<T>(fileName: string): Promise<T[]> {
  const content = await fs.readFile(path.join(GTFS_DIR, fileName), "utf8");

  return parse(content, {
    columns: true,
    skip_empty_lines: true,
  }) as T[];
}

function parseGtfsTime(time: string) {
  const [hours, minutes, seconds] = time.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

async function main() {
  const trips = await loadCsv<TripRow>("trips.txt");
  const stopTimes = await loadCsv<StopTimeRow>("stop_times.txt");

  const tripInfo = new Map<string, TripRow>();
  for (const trip of trips) {
    tripInfo.set(trip.trip_id, trip);
  }

  const stopsByTrip = new Map<
    string,
    { stopId: string; arrival: number; departure: number; sequence: number }[]
  >();

  for (const stopTime of stopTimes) {
    if (!stopsByTrip.has(stopTime.trip_id)) {
      stopsByTrip.set(stopTime.trip_id, []);
    }

    stopsByTrip.get(stopTime.trip_id)!.push({
      stopId: stopTime.stop_id,
      arrival: parseGtfsTime(stopTime.arrival_time),
      departure: parseGtfsTime(stopTime.departure_time),
      sequence: Number(stopTime.stop_sequence),
    });
  }

  const timetables: Timetables = {};

  for (const [tripId, stops] of stopsByTrip) {
    const trip = tripInfo.get(tripId);
    if (!trip) continue;

    timetables[trip.route_id] ??= {};
    timetables[trip.route_id][trip.direction_id] ??= [];

    timetables[trip.route_id][trip.direction_id].push({
      tripId,
      serviceId: trip.service_id,
      stops: stops
        .sort((a, b) => a.sequence - b.sequence)
        .map((stop) => [stop.stopId, stop.arrival, stop.departure]),
    });
  }

  for (const routeDirections of Object.values(timetables)) {
    for (const tripsForDirection of Object.values(routeDirections)) {
      tripsForDirection.sort((a, b) => a.stops[0][2] - b.stops[0][2]);
    }
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUTPUT_DIR, "timetables.json"), JSON.stringify(timetables));

  console.log("Generated timetables.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
