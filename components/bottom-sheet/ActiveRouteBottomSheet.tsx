import { MaterialIcons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useMemo, useRef } from "react";
import { Text, TouchableOpacity, View } from "react-native";

import {
  RouteCandidate,
  formatRouteTime,
  getRouteTiming,
} from "@/utils/routing/offlineRouter";

interface Props {
  route: RouteCandidate;
  onClearRoute: () => void;
}

export function ActiveRouteBottomSheet({ route, onClearRoute }: Props) {
  const snapPoints = useMemo(() => ["22%", "50%"], []);
  const timing = useMemo(() => getRouteTiming(route), [route]);
  const hasOpenedRef = useRef(false);

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

        if (hasOpenedRef.current) {
          onClearRoute();
        }
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
            <Text style={{ color: "#6b7280", fontWeight: "500", marginTop: 2 }}>
              {route.steps
                .filter((step) => step.type === "bus")
                .map((step) => `Linea ${step.routeId}`)
                .join(" -> ") || "Trayecto a pie"}
            </Text>
            <Text style={{ color: "#374151", fontWeight: "700", marginTop: 4 }}>
              Llegada {formatRouteTime(timing.arrivalTimeSeconds)}
            </Text>
          </View>

          <TouchableOpacity
            onPress={onClearRoute}
            style={{
              backgroundColor: "#ef4444",
              paddingHorizontal: 10,
              paddingVertical: 10,
              borderRadius: 24,
              flexDirection: "row",
              alignItems: "center",
              elevation: 2,
              shadowColor: "#000",
              shadowOpacity: 0.1,
              shadowRadius: 3,
            }}
          >
            <MaterialIcons name="close" size={18} color="white" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 1, backgroundColor: "#f3f4f6", marginVertical: 16 }} />

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
                    <Text style={{ color: "#374151", fontWeight: "700", fontSize: 14 }}>
                      Transbordo en {transferStopName}
                    </Text>
                    <Text style={{ color: "#6b7280", fontSize: 13 }}>
                      Baja aqui y vuelve a subir en esta parada.
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

            return (
              <View key={index} style={{ gap: 2 }}>
                <Text style={{ color: "#2563eb", fontWeight: "700", fontSize: 14 }}>
                  Subir a linea {step.routeId}
                  {step.fromStopName ? ` en ${step.fromStopName}` : ""}
                </Text>
                <Text style={{ color: "#4b5563", fontSize: 13 }}>
                  Sale a las {formatRouteTime(step.departureTimeSeconds)}
                  {step.waitMinutes !== null ? ` (${step.waitMinutes} min de espera)` : ""}.
                </Text>
                <Text style={{ color: "#4b5563", fontSize: 13 }}>
                  Bajar en {step.toStopName ?? "la parada indicada"} a las{" "}
                  {formatRouteTime(step.arrivalTimeSeconds)} tras {step.stopCount}{" "}
                  {step.stopCount === 1 ? "parada" : "paradas"}.
                </Text>
              </View>
            );
          })}
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}
