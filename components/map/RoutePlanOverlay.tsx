import { getTransitRouteColorMap } from "@/services/transit/transitRepository";
import {
  RouteStep,
  TransitStep,
  WalkStep,
} from "@/utils/routing/offlineRouter";
import { useEffect, useMemo, useRef, useState } from "react";
import { Polyline } from "react-native-maps";

interface Props {
  routePlan: RouteStep[];
  version: number;
}

type Coord = { latitude: number; longitude: number };

// ─── Valhalla ─────────────────────────────────────────────────────────────────
// Valhalla con perfil "pedestrian" respeta aceras, pasos de peatones y zonas
// peatonales, a diferencia de OSRM foot que sigue la calzada.
// Instancia pública gratuita, sin API key.
const VALHALLA_BASE = "https://valhalla1.openstreetmap.de/route";

/**
 * Decodifica el formato polyline6 que usa Valhalla (precisión 1e-6).
 * Igual que polyline5 pero con factor 1e6 en lugar de 1e5.
 */
function decodePolyline6(encoded: string): Coord[] {
  const coords: Coord[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push({ latitude: lat / 1e6, longitude: lng / 1e6 });
  }

  return coords;
}

/**
 * Llama a Valhalla y devuelve los puntos reales de la ruta peatonal.
 * Si falla por cualquier motivo devuelve null (el caller usa línea recta).
 */
async function fetchWalkGeometry(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): Promise<Coord[] | null> {
  try {
    const body = JSON.stringify({
      locations: [
        { lat: fromLat, lon: fromLng },
        { lat: toLat, lon: toLng },
      ],
      costing: "pedestrian",
      directions_options: { units: "kilometers" },
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(VALHALLA_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) return null;
    const json = await res.json();

    // Valhalla devuelve la geometría como polyline6 encoded en trip.legs[].shape
    const encoded: string = json?.trip?.legs?.[0]?.shape;
    if (!encoded) return null;

    return decodePolyline6(encoded);
  } catch {
    return null;
  }
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function RoutePlanOverlay({ routePlan, version }: Props) {
  const routeColorMap = useMemo(() => {
    return getTransitRouteColorMap();
  }, []);

  // walkCoords[index] = coordenadas reales del tramo a pie en esa posición.
  // null = todavía cargando (usamos línea recta de fallback).
  const [walkCoords, setWalkCoords] = useState<Record<number, Coord[]>>({});

  // Ref para cancelar efectos de versiones anteriores del plan
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cancelar peticiones anteriores si el plan cambia
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setWalkCoords({});

    const walkSteps = routePlan
      .map((step, index) => ({ step, index }))
      .filter(
        ({ step }) =>
          step.type === "walk" && (step as WalkStep).distanceMeters !== 0,
      );

    if (!walkSteps.length) return;

    walkSteps.forEach(async ({ step, index }) => {
      const w = step as WalkStep;
      const coords = await fetchWalkGeometry(
        w.fromLat,
        w.fromLng,
        w.toLat,
        w.toLng,
      );

      if (controller.signal.aborted) return;

      if (coords) {
        setWalkCoords((prev) => ({ ...prev, [index]: coords }));
      }
    });

    return () => controller.abort();
  }, [routePlan, version]);

  if (!routePlan?.length) return null;

  return (
    <>
      {routePlan.map((step: RouteStep, index: number) => {
        if (step.type === "walk") {
          const walkStep = step as WalkStep;
          if (walkStep.distanceMeters === 0) return null;

          // Coordenadas reales si ya llegaron, línea recta como fallback
          const coords: Coord[] = walkCoords[index] ?? [
            { latitude: walkStep.fromLat, longitude: walkStep.fromLng },
            { latitude: walkStep.toLat, longitude: walkStep.toLng },
          ];

          return (
            <Polyline
              key={`route-plan-${version}-walk-${index}-${walkStep.fromLat}-${walkStep.fromLng}-${walkStep.toLat}-${walkStep.toLng}`}
              coordinates={coords}
              strokeColor="#111827"
              strokeWidth={3}
              lineDashPattern={[6, 6]}
            />
          );
        }

        if (step.type === "transit") {
          const transitStep = step as TransitStep;
          if (!transitStep.shapeCoords?.length) return null;
          const color = routeColorMap[transitStep.routeId] ?? "#2563eb";
          return (
            <Polyline
              key={`route-plan-${version}-transit-${index}-${transitStep.routeId}-${transitStep.fromStopId}-${transitStep.toStopId}-${transitStep.shapeCoords.length}`}
              coordinates={transitStep.shapeCoords}
              strokeColor={color}
              strokeWidth={5}
            />
          );
        }

        return null;
      })}
    </>
  );
}
