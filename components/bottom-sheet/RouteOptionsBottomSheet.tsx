import { MaterialIcons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { forwardRef, useMemo } from "react";
import { Pressable, Text, TouchableOpacity, View } from "react-native";

import {
  RouteCandidate,
  countTransfers,
  estimateRouteMinutes,
} from "@/utils/routing/offlineRouter";

interface Props {
  routes: RouteCandidate[];
  onSelectRoute: (route: RouteCandidate) => void;
  onClose: () => void;
}

export const RouteOptionsBottomSheet = forwardRef<BottomSheet, Props>(
  ({ routes, onSelectRoute, onClose }, ref) => {
    const snapPoints = useMemo(() => ["30%", "60%"], []);

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        onChange={(index) => {
          if (index === -1) {
            onClose();
          }
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: "#f3f4f6",
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
            }}
          >
            Rutas disponibles
          </Text>

          <TouchableOpacity
            onPress={() => {
              if (ref && typeof ref !== "function") {
                ref.current?.close();
              }
            }}
          >
            <MaterialIcons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>
        <BottomSheetFlatList
          data={routes}
          keyExtractor={(_, index) => String(index)}
          renderItem={({ item, index }) => {
            const buses = item.steps.filter((s) => s.type === "bus").map((s) => s.routeId);
            const duration = estimateRouteMinutes(item);
            const transfers = countTransfers(item);

            return (
              <Pressable
                onPress={() => onSelectRoute(item)}
                style={{
                  padding: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: "#eee",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  {index === 0 && (
                    <Text
                      style={{
                        color: "#16a34a",
                        fontWeight: "700",
                        marginRight: 8,
                      }}
                    >
                      Recomendada
                    </Text>
                  )}

                  <Text style={{ fontWeight: "600" }}>{buses.join(" → ")}</Text>
                </View>

                <View
                  style={{
                    marginTop: 6,
                    gap: 4,
                  }}
                >
                  {item.steps.map((step, idx) => {
                    if (step.type === "walk") {
                      return <Text key={idx}>🚶 {Math.round(step.distanceMeters ?? 0)} m</Text>;
                    }

                    return (
                      <Text key={idx}>
                        🚌 Línea {step.routeId} ({step.stopCount} paradas)
                      </Text>
                    );
                  })}

                  <Text
                    style={{
                      marginTop: 8,
                      color: "#2563eb",
                      fontWeight: "600",
                    }}
                  >
                    ⏱ {duration} min
                    {transfers > 0 ? ` · ${transfers} transbordo` : ""}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      </BottomSheet>
    );
  }
);
