import { parse } from "csv-parse/sync";
import fs from "fs/promises";
import path from "path";

const GTFS_DIR = path.join(process.cwd(), "gtfs", "tuvisa");

const OUTPUT_DIR = path.join(process.cwd(), "data", "gtfs");

async function loadCsv(fileName: string) {
  const content = await fs.readFile(path.join(GTFS_DIR, fileName), "utf8");

  return parse(content, {
    columns: true,
    skip_empty_lines: true,
  });
}

async function main() {
  console.log("Loading GTFS files...");

  const routes = await loadCsv("routes.txt");
  const trips = await loadCsv("trips.txt");
  const stops = await loadCsv("stops.txt");
  const stopTimes = await loadCsv("stop_times.txt");

  console.log(
    `Routes: ${routes.length}, Trips: ${trips.length}, Stops: ${stops.length}, StopTimes: ${stopTimes.length}`
  );

  const tripToRoute = new Map<string, string>();

  for (const trip of trips) {
    tripToRoute.set(trip.trip_id, trip.route_id);
  }

  const stopRoutes = new Map<string, Set<string>>();

  for (const stopTime of stopTimes) {
    const routeId = tripToRoute.get(stopTime.trip_id);

    if (!routeId) {
      continue;
    }

    if (!stopRoutes.has(stopTime.stop_id)) {
      stopRoutes.set(stopTime.stop_id, new Set());
    }

    stopRoutes.get(stopTime.stop_id)?.add(routeId);
  }

  const routeNames = new Map<string, string>();

  for (const route of routes) {
    routeNames.set(route.route_id, route.route_short_name || route.route_long_name);
  }

  const formattedStops = stops.map((stop: any) => ({
    id: stop.stop_id,
    name: stop.stop_name,
    latitude: Number(stop.stop_lat),
    longitude: Number(stop.stop_lon),

    routes: Array.from(stopRoutes.get(stop.stop_id) ?? [])
      .sort()
      .map((routeId) => ({
        id: routeId,
        name: routeNames.get(routeId) ?? routeId,
      })),
  }));

  await fs.mkdir(OUTPUT_DIR, {
    recursive: true,
  });

  await fs.writeFile(path.join(OUTPUT_DIR, "stops.json"), JSON.stringify(formattedStops, null, 2));

  console.log(`Generated ${formattedStops.length} stops`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
