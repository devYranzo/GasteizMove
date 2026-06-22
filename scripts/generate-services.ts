import { parse } from "csv-parse/sync";
import fs from "fs/promises";
import path from "path";

type CalendarDateRow = {
  service_id: string;
  date: string;
  exception_type: string;
};

type ServiceDates = Record<string, string[]>;

const GTFS_DIR = path.join(process.cwd(), "gtfs", "tuvisa");
const OUTPUT_DIR = path.join(process.cwd(), "data", "gtfs");

async function loadCsv<T>(fileName: string): Promise<T[]> {
  const content = await fs.readFile(path.join(GTFS_DIR, fileName), "utf8");

  return parse(content, {
    columns: true,
    skip_empty_lines: true,
  }) as T[];
}

async function main() {
  const rows = await loadCsv<CalendarDateRow>("calendar_dates.txt");

  const services: ServiceDates = {};

  for (const row of rows) {
    if (row.exception_type !== "1") continue;

    services[row.service_id] ??= [];
    services[row.service_id].push(row.date);
  }

  for (const dates of Object.values(services)) {
    dates.sort();
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  await fs.writeFile(path.join(OUTPUT_DIR, "service_dates.json"), JSON.stringify(services));

  console.log(`Generated service_dates.json (${Object.keys(services).length} services)`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
