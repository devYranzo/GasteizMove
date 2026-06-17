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
  const routes = await loadCsv("routes.txt");
  const trips = await loadCsv("trips.txt");
  const shapes = await loadCsv("shapes.txt");

  const routeInfo = new Map<
    string,
    {
      shortName: string;
      longName: string;
      color: string;
    }
  >();

  for (const route of routes) {
    routeInfo.set(route.route_id, {
      shortName: route.route_short_name,
      longName: route.route_long_name,
      color: route.route_color,
    });
  }

  const shapeCoordinates = new Map<
    string,
    {
      latitude: number;
      longitude: number;
      sequence: number;
    }[]
  >();

  for (const shape of shapes) {
    if (!shapeCoordinates.has(shape.shape_id)) {
      shapeCoordinates.set(shape.shape_id, []);
    }

    shapeCoordinates.get(shape.shape_id)!.push({
      latitude: Number(shape.shape_pt_lat),
      longitude: Number(shape.shape_pt_lon),
      sequence: Number(shape.shape_pt_sequence),
    });
  }

  const result = [];

  const seenShapes = new Set<string>();

  for (const trip of trips) {
    if (seenShapes.has(trip.shape_id)) {
      continue;
    }

    seenShapes.add(trip.shape_id);

    const coordinates =
      shapeCoordinates
        .get(trip.shape_id)
        ?.sort((a, b) => a.sequence - b.sequence)
        .map((point) => [point.longitude, point.latitude]) ?? [];

    const route = routeInfo.get(trip.route_id);

    result.push({
      routeId: trip.route_id,
      directionId: trip.direction_id,
      shapeId: trip.shape_id,
      headsign: trip.trip_headsign,
      shortName: route?.shortName ?? trip.route_id,
      longName: route?.longName ?? "",
      color: route?.color ?? "2563EB",
      coordinates,
    });
  }

  await fs.mkdir(OUTPUT_DIR, {
    recursive: true,
  });

  await fs.writeFile(path.join(OUTPUT_DIR, "routes.json"), JSON.stringify(result, null, 2));

  console.log(`Generated ${result.length} route shapes`);
}

main().catch(console.error);
