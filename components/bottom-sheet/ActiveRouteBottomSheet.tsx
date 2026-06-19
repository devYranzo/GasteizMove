import { MaterialIcons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useMemo, useRef } from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { RouteCandidate, estimateRouteMinutes } from "@/utils/routing/offlineRouter";

interface Props {
  route: RouteCandidate;
  onClearRoute: () => void;
}

export function ActiveRouteBottomSheet({ route, onClearRoute }: Props) {
  const snapPoints = useMemo(() => ["22%", "50%"], []);
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
              {estimateRouteMinutes(route)} min
            </Text>
            <Text style={{ color: "#6b7280", fontWeight: "500", marginTop: 2 }}>
              {route.steps
                .filter((step) => step.type === "bus")
                .map((step) => `Linea ${step.routeId}`)
                .join(" -> ") || "Trayecto a pie"}
            </Text>
          </View>

          <TouchableOpacity
            onPress={onClearRoute}
            style={{
              backgroundColor: "#ef4444",
              paddingHorizontal: 18,
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
            <Text style={{ color: "white", fontWeight: "700", marginLeft: 6 }}>Salir</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 1, backgroundColor: "#f3f4f6", marginVertical: 16 }} />

        <View style={{ gap: 12 }}>
          <Text style={{ fontWeight: "700", color: "#374151", fontSize: 15 }}>
            Indicaciones de la ruta:
          </Text>

          {route.steps.map((step, index) => {
            if (step.type === "walk") {
              return (
                <Text key={index} style={{ color: "#4b5563", fontSize: 14 }}>
                  Caminar {Math.round(step.distanceMeters ?? 0)} metros.
                </Text>
              );
            }

            return (
              <Text key={index} style={{ color: "#2563eb", fontWeight: "600", fontSize: 14 }}>
                Subir a linea {step.routeId} ({step.stopCount} paradas).
              </Text>
            );
          })}
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}
