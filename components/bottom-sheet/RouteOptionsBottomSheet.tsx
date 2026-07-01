import { MaterialIcons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { forwardRef, useMemo } from "react";
import { Pressable, Text, TouchableOpacity, View } from "react-native";

import {
  RouteCandidate,
  countTransfers,
  formatRouteTime,
  getRouteTiming,
} from "@/utils/routing/offlineRouter";
import {
  getTransitLineLabel,
  getTransitModeColor,
  getTransitModeLabel,
} from "@/services/transit/transitModes";

interface Props {
  routes: RouteCandidate[];
  onSelectRoute: (route: RouteCandidate) => void;
  onClose: () => void;
  // Fecha capturada cuando se calculó la ruta, para que getRouteTiming
  // use el mismo instante que findRoute y no la hora actual del render.
  routeDate?: Date;
}

export const RouteOptionsBottomSheet = forwardRef<BottomSheet, Props>(
  ({ routes, onSelectRoute, onClose, routeDate }, ref) => {
    const snapPoints = useMemo(() => ["38%", "68%"], []);
    const bestRoutes = useMemo(() => routes.slice(0, 3), [routes]);

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
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: "#f3f4f6",
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
              <Text
                style={{ fontSize: 21, fontWeight: "800", color: "#111827" }}
              >
                Elige ruta
              </Text>
              <Text
                style={{
                  marginTop: 2,
                  color: "#6b7280",
                  fontSize: 13,
                  fontWeight: "500",
                }}
              >
                Las {bestRoutes.length} mejores opciones encontradas
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                if (ref && typeof ref !== "function") {
                  ref.current?.close();
                }
              }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "#ef4444",
                justifyContent: "center",
                alignItems: "center",
                elevation: 2,
                shadowColor: "#000",
                shadowOpacity: 0.1,
                shadowRadius: 3,
              }}
            >
              <MaterialIcons name="close" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <BottomSheetFlatList
          data={bestRoutes}
          keyExtractor={(_, index) => `route-option-${index}`}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item, index }) => {
            const transitSteps = item.steps.filter(
              (step) => step.type === "transit",
            );
            const timing = getRouteTiming(item, routeDate ?? new Date());
            const firstTransitStep = timing.steps.find(
              (step) => step.type === "transit",
            );
            const duration = timing.totalMinutes;
            const transfers = countTransfers(item);
            const walkMeters = item.steps
              .filter((step) => step.type === "walk")
              .reduce((total, step) => total + (step.distanceMeters ?? 0), 0);

            return (
              <Pressable
                onPress={() => onSelectRoute(item)}
                style={({ pressed }) => ({
                  padding: 16,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: index === 0 ? "#bfdbfe" : "#e5e7eb",
                  backgroundColor: pressed ? "#f9fafb" : "white",
                  shadowColor: "#000",
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 3 },
                  elevation: 2,
                })}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Text
                        numberOfLines={1}
                        style={{
                          fontSize: 22,
                          fontWeight: "800",
                          color: "#111827",
                        }}
                      >
                        {duration} min
                      </Text>

                      {index === 0 && (
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 12,
                            backgroundColor: "#dcfce7",
                          }}
                        >
                          <Text
                            style={{
                              color: "#166534",
                              fontSize: 12,
                              fontWeight: "800",
                            }}
                          >
                            Recomendada
                          </Text>
                        </View>
                      )}
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 6,
                        marginTop: 10,
                      }}
                    >
                      {transitSteps.length > 0 ? (
                        transitSteps.map((step, transitIndex) => {
                          const modeColor = getTransitModeColor(step.vehicle);
                          return (
                            <View
                              key={`${step.routeId}-${transitIndex}`}
                              style={{
                                paddingHorizontal: 10,
                                paddingVertical: 5,
                                borderRadius: 14,
                                backgroundColor: `${modeColor}14`,
                                borderWidth: 1,
                                borderColor: `${modeColor}33`,
                              }}
                            >
                              <Text
                                style={{
                                  color: modeColor,
                                  fontWeight: "800",
                                  fontSize: 13,
                                }}
                              >
                                {getTransitLineLabel(step.vehicle)}{" "}
                                {step.routeId}
                              </Text>
                            </View>
                          );
                        })
                      ) : (
                        <View
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 14,
                            backgroundColor: "#f3f4f6",
                          }}
                        >
                          <Text
                            style={{
                              color: "#374151",
                              fontWeight: "700",
                              fontSize: 13,
                            }}
                          >
                            A pie
                          </Text>
                        </View>
                      )}
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        gap: 12,
                        flexWrap: "wrap",
                        marginTop: 12,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <MaterialIcons
                          name="sync-alt"
                          size={16}
                          color="#6b7280"
                        />
                        <Text
                          style={{
                            color: "#4b5563",
                            fontSize: 13,
                            fontWeight: "600",
                          }}
                        >
                          {transfers === 0
                            ? "Sin transbordos"
                            : `${transfers} ${transfers === 1 ? "transbordo" : "transbordos"}`}
                        </Text>
                      </View>

                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <MaterialIcons
                          name="directions-walk"
                          size={16}
                          color="#6b7280"
                        />
                        <Text
                          style={{
                            color: "#4b5563",
                            fontSize: 13,
                            fontWeight: "600",
                          }}
                        >
                          {Math.round(walkMeters)} m a pie
                        </Text>
                      </View>
                    </View>

                    <View style={{ marginTop: 8, gap: 4 }}>
                      {firstTransitStep?.type === "transit" && (
                        <Text
                          style={{
                            color: "#374151",
                            fontSize: 13,
                            fontWeight: "700",
                          }}
                        >
                          Primer {getTransitModeLabel(firstTransitStep.vehicle)}{" "}
                          {formatRouteTime(
                            firstTransitStep.departureTimeSeconds,
                          )}
                          {firstTransitStep.waitMinutes !== null
                            ? ` · espera ${firstTransitStep.waitMinutes} min`
                            : ""}
                        </Text>
                      )}
                      <Text
                        style={{
                          color: "#374151",
                          fontSize: 13,
                          fontWeight: "700",
                        }}
                      >
                        Llegada {formatRouteTime(timing.arrivalTimeSeconds)}
                      </Text>
                    </View>

                    <View style={{ marginTop: 10, gap: 6 }}>
                      {item.steps
                        .filter((step) => step.type === "transit")
                        .map((step, stepIndex) => (
                          <Text
                            key={stepIndex}
                            numberOfLines={2}
                            style={{ color: "#6b7280", fontSize: 13 }}
                          >
                            {getTransitLineLabel(step.vehicle)} {step.routeId}:{" "}
                            {step.fromStopName ?? "origen"}
                            {" -> "}
                            {step.toStopName ?? "destino"}
                          </Text>
                        ))}
                    </View>
                  </View>

                  <MaterialIcons
                    name="chevron-right"
                    size={26}
                    color="#9ca3af"
                  />
                </View>
              </Pressable>
            );
          }}
        />
      </BottomSheet>
    );
  },
);
