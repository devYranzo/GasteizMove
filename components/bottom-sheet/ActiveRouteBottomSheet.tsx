import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import * as Location from "expo-location";
import { useMemo, useRef } from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { useFavorites } from "@/hooks/useFavorites";
import {
  getTransitModeColor,
  getTransitModeLabel,
} from "@/services/transit/transitModes";
import {
  RouteCandidate,
  formatRouteTime,
  getRouteTiming,
} from "@/utils/routing/offlineRouter";

interface Props {
  route: RouteCandidate;
  onClearRoute: () => void;
  routeDate?: Date;
  destLat: number;
  destLng: number;
  destName: string;
}

export function ActiveRouteBottomSheet({
  route,
  onClearRoute,
  routeDate,
  destLat,
  destLng,
  destName,
}: Props) {
  const snapPoints = useMemo(() => ["22%", "50%"], []);
  const timing = useMemo(
    () => getRouteTiming(route, routeDate ?? new Date()),
    [route, routeDate],
  );
  const hasOpenedRef = useRef(false);
  const { favorites, addFavorite, removeFavorite } = useFavorites();

  const routeFavId = useMemo(() => {
    const transitIds = route.steps
      .filter((s) => s.type === "transit")
      .map((s) => s.routeId)
      .join("-");
    return transitIds || "walk";
  }, [route]);

  // Título del favorito: líneas usadas + destino
  const routeFavTitle = useMemo(() => {
    const lines = route.steps
      .filter((s) => s.type === "transit")
      .map((s) => `L${s.routeId}`)
      .join(", ");
    return lines ? `${lines} → ${destName}` : `A pie → ${destName}`;
  }, [route, destName]);

  const isFav = favorites.some(
    (f) => f.type === "route" && f.refId === routeFavId,
  );

  async function toggleFavorite() {
    if (isFav) {
      await removeFavorite("route", routeFavId);
    } else {
      let originLat = 42.846;
      let originLng = -2.673;
      try {
        const loc = await Location.getCurrentPositionAsync({});
        originLat = loc.coords.latitude;
        originLng = loc.coords.longitude;
      } catch {}

      await addFavorite({
        id: `route-${routeFavId}`,
        type: "route",
        title: routeFavTitle,
        refId: routeFavId,
        createdAt: Date.now(),
        metadata: { originLat, originLng, destLat, destLng, destName },
      });
    }
  }

  const lineLabels = route.steps
    .filter((s) => s.type === "transit")
    .map((s) => ({ routeId: s.routeId, vehicle: s.vehicle }));

  return (
    <BottomSheet
      index={0}
      animateOnMount={false}
      snapPoints={snapPoints}
      enablePanDownToClose
      onChange={(index) => {
        if (index >= 0) {
          hasOpenedRef.current = true;
          return;
        }
        if (hasOpenedRef.current) onClearRoute();
      }}
    >
      <BottomSheetView
        style={{
          flex: 1,
          paddingHorizontal: 20,
          paddingVertical: 10,
          backgroundColor: "white",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ fontSize: 22, fontWeight: "800", color: "#111827" }}>
              {timing.totalMinutes} min
            </Text>

            {/* Líneas usadas */}
            {lineLabels.length > 0 && (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 6,
                  marginTop: 6,
                }}
              >
                {lineLabels.map(({ routeId, vehicle }) => (
                  <View
                    key={routeId}
                    style={{
                      backgroundColor: getTransitModeColor(vehicle),
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                    }}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontWeight: "700",
                        fontSize: 13,
                      }}
                    >
                      {routeId}
                    </Text>
                  </View>
                ))}
                <View style={{ justifyContent: "center" }}>
                  <Text style={{ color: "#6b7280", fontSize: 13 }}>
                    → {destName}
                  </Text>
                </View>
              </View>
            )}

            <Text style={{ color: "#374151", fontWeight: "700", marginTop: 6 }}>
              Llegada {formatRouteTime(timing.arrivalTimeSeconds)}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {/* ⭐ Favorito */}
            <TouchableOpacity
              onPress={toggleFavorite}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: isFav ? "#fefce8" : "#f9fafb",
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 1,
                borderColor: isFav ? "#fde68a" : "#e5e7eb",
              }}
            >
              <MaterialCommunityIcons
                name={isFav ? "star" : "star-outline"}
                size={22}
                color={isFav ? "#facc15" : "#9ca3af"}
              />
            </TouchableOpacity>

            {/* ❌ Cerrar */}
            <TouchableOpacity
              onPress={onClearRoute}
              style={{
                backgroundColor: "#ef4444",
                padding: 10,
                borderRadius: 24,
                alignItems: "center",
                justifyContent: "center",
                elevation: 2,
                shadowColor: "#000",
                shadowOpacity: 0.1,
                shadowRadius: 3,
              }}
            >
              <MaterialIcons name="close" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={{ height: 1, backgroundColor: "#f3f4f6", marginVertical: 16 }}
        />

        <View style={{ gap: 12 }}>
          <Text style={{ fontWeight: "700", color: "#374151", fontSize: 15 }}>
            Indicaciones de la ruta:
          </Text>

          {timing.steps.map((step, index) => {
            if (step.type === "walk") {
              const distance = Math.round(step.distanceMeters ?? 0);
              const transferStopName = step.fromName ?? step.toName;

              if (distance === 0 && transferStopName) {
                return (
                  <View key={index} style={{ gap: 2 }}>
                    <Text
                      style={{
                        color: "#374151",
                        fontWeight: "700",
                        fontSize: 14,
                      }}
                    >
                      Transbordo en {transferStopName}
                    </Text>
                    <Text style={{ color: "#6b7280", fontSize: 13 }}>
                      Baja aquí y vuelve a subir en esta parada.
                    </Text>
                  </View>
                );
              }

              return (
                <View key={index} style={{ gap: 2 }}>
                  <Text style={{ color: "#4b5563", fontSize: 14 }}>
                    Caminar {step.durationMinutes} min ({distance} m)
                    {step.toName ? ` hasta ${step.toName}` : ""}.
                  </Text>
                </View>
              );
            }

            const vehicleLabel =
              step.vehicle === "tram"
                ? "tranvía"
                : step.vehicle === "night_bus"
                  ? "bus nocturno"
                  : "bus";

            const modeColor = getTransitModeColor(step.vehicle);

            return (
              <View key={index} style={{ gap: 2 }}>
                <Text
                  style={{
                    color: modeColor,
                    fontWeight: "700",
                    fontSize: 14,
                  }}
                >
                  Subir al {vehicleLabel} {step.routeId}
                  {step.fromStopName ? ` en ${step.fromStopName}` : ""}
                </Text>
                <Text style={{ color: "#4b5563", fontSize: 13 }}>
                  Sale a las {formatRouteTime(step.departureTimeSeconds)}
                  {step.waitMinutes !== null
                    ? ` (${step.waitMinutes} min de espera)`
                    : ""}
                  .
                </Text>
                <Text style={{ color: "#4b5563", fontSize: 13 }}>
                  Bajar en {step.toStopName ?? "la parada indicada"} a las{" "}
                  {formatRouteTime(step.arrivalTimeSeconds)} tras{" "}
                  {step.stopCount} {step.stopCount === 1 ? "parada" : "paradas"}
                  .
                </Text>
              </View>
            );
          })}
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}
