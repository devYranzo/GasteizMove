import { TransitMode } from "@/types/transit";

export type TransitModeConfig = {
  mode: TransitMode;
  routePrefixes: string[];
  nightServiceId?: string;
  stopPenaltySeconds: number;
  color: string;
  label: string;
  lineLabel: string;
};

export const TRANSIT_MODE_CONFIGS: TransitModeConfig[] = [
  {
    mode: "bus",
    routePrefixes: [],
    stopPenaltySeconds: 40,
    color: "#2563eb",
    label: "bus",
    lineLabel: "Linea",
  },
  {
    mode: "night_bus",
    routePrefixes: ["G"],
    nightServiceId: "Gautxori",
    stopPenaltySeconds: 40,
    color: "#4338ca",
    label: "bus nocturno",
    lineLabel: "Linea",
  },
  {
    mode: "tram",
    routePrefixes: ["T"],
    stopPenaltySeconds: 25,
    color: "#0891b2",
    label: "tranvia",
    lineLabel: "Tranvia",
  },
];

export function getTransitModeConfigForRoute(
  routeId: string,
): TransitModeConfig {
  for (const config of TRANSIT_MODE_CONFIGS) {
    if (config.routePrefixes.some((prefix) => routeId.startsWith(prefix))) {
      return config;
    }
  }

  return TRANSIT_MODE_CONFIGS.find(
    (config) => config.routePrefixes.length === 0,
  )!;
}

export function getTransitModeForRoute(routeId: string): TransitMode {
  return getTransitModeConfigForRoute(routeId).mode;
}

export function getTransitModeColor(mode: TransitMode): string {
  return (
    TRANSIT_MODE_CONFIGS.find((config) => config.mode === mode)?.color ??
    "#2563eb"
  );
}

export function getTransitModeLabel(mode: TransitMode): string {
  return (
    TRANSIT_MODE_CONFIGS.find((config) => config.mode === mode)?.label ??
    "transporte"
  );
}

export function getTransitLineLabel(mode: TransitMode): string {
  return (
    TRANSIT_MODE_CONFIGS.find((config) => config.mode === mode)?.lineLabel ??
    "Linea"
  );
}
