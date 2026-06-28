import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { forwardRef, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, TouchableOpacity, View } from "react-native";

import { useFavorites } from "@/hooks/useFavorites";
import { StopArrival, formatArrivalTime } from "@/utils/arrivals/stopArrivals";
import { MaterialIcons } from "@expo/vector-icons";
import { FavoriteButton } from "../FavoriteButton";

type Stop = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  routes: {
    id: string;
    name: string;
  }[];
};

interface Props {
  stop: Stop | null;
  arrivals: StopArrival[];
  arrivalsLoading?: boolean;
  onChange?: (index: number) => void;
  onRoutePress?: (routeId: string) => void;
  onClearRoute?: () => void;
  onClose?: () => void;
  selectedRouteId?: string | null;
}

export const StopBottomSheet = forwardRef<BottomSheet, Props>(
  (
    {
      stop,
      arrivals,
      arrivalsLoading = false,
      onChange,
      onRoutePress,
      onClearRoute,
      onClose,
      selectedRouteId,
    },
    ref
  ) => {
    const snapPoints = useMemo(() => ["25%", "50%"], []);
    const [pressedId, setPressedId] = useState<string | null>(null);

    const { favorites } = useFavorites();

    const isFavorite = useMemo(() => {
      if (!stop) return false;
      return favorites.some((f) => f.type === "stop" && f.refId === stop.id);
    }, [favorites, stop]);

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        onChange={onChange}
      >
        <BottomSheetView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 12 }}>
          {stop && (
            <>
              {/* HEADER */}
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 18 }}>
                <Text style={{ fontSize: 22, fontWeight: "600", flex: 1 }}>{stop.name}</Text>

                <FavoriteButton id={stop.id} title={stop.name} type="stop" />

                {selectedRouteId && (
                  <TouchableOpacity
                    onPress={onClearRoute}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 6,
                    }}
                  >
                    <Text style={{ fontSize: 20, fontWeight: "700", color: "#2563eb" }}>↺</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={onClose}
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

              {/* PRÓXIMAS LLEGADAS */}
              <View
                style={{ flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 }}
              >
                <Text style={{ fontSize: 14, color: "#6b7280", fontWeight: "500" }}>
                  Próximas salidas
                </Text>
                {/* Indicador en vivo — solo si hay al menos un dato real */}
                {!arrivalsLoading && arrivals.some((a) => a.isRealtime) && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "#f0fdf4",
                      borderRadius: 6,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      gap: 4,
                    }}
                  >
                    <View
                      style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#16a34a" }}
                    />
                    <Text style={{ fontSize: 11, color: "#16a34a", fontWeight: "600" }}>
                      En vivo
                    </Text>
                  </View>
                )}
              </View>

              {/* LOADING */}
              {arrivalsLoading ? (
                <View style={{ alignItems: "center", paddingTop: 32 }}>
                  <ActivityIndicator size="small" color="#2563eb" />
                  <Text style={{ color: "#9ca3af", fontSize: 13, marginTop: 8 }}>
                    Cargando horarios…
                  </Text>
                </View>
              ) : arrivals.length === 0 ? (
                <Text style={{ color: "#6b7280", textAlign: "center", marginTop: 20 }}>
                  No hay próximas salidas disponibles
                </Text>
              ) : (
                <View>
                  {arrivals.map((arrival) => {
                    const id = `${arrival.routeId}-${arrival.directionId}-${arrival.departureTimeSeconds}`;
                    const isPressed = pressedId === id;
                    const delayColor =
                      arrival.isRealtime && arrival.delayMinutes !== undefined
                        ? arrival.delayMinutes > 1
                          ? "#ef4444"
                          : arrival.delayMinutes < 0
                            ? "#16a34a"
                            : "#6b7280"
                        : "#6b7280";

                    return (
                      <Pressable
                        key={id}
                        onPress={() => onRoutePress?.(arrival.routeId)}
                        onPressIn={() => setPressedId(id)}
                        onPressOut={() => setPressedId(null)}
                        style={{
                          paddingVertical: 14,
                          paddingHorizontal: 14,
                          marginBottom: 12,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: "#eee",
                          backgroundColor: isPressed ? "#f3f4f6" : "white",
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          {/* Badge línea */}
                          <View
                            style={{
                              backgroundColor: arrival.routeColor,
                              borderRadius: 8,
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                              marginRight: 12,
                            }}
                          >
                            <Text style={{ color: "white", fontWeight: "700", fontSize: 14 }}>
                              {arrival.routeName}
                            </Text>
                          </View>

                          {/* Destino */}
                          <View style={{ flex: 1 }}>
                            <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: "500" }}>
                              {arrival.destination}
                            </Text>
                          </View>

                          {/* Tiempo */}
                          <View style={{ alignItems: "flex-end", marginLeft: 12 }}>
                            {/* Minutos restantes */}
                            <Text style={{ fontSize: 16, fontWeight: "700", color: "#2563eb" }}>
                              {arrival.waitMinutes <= 0 ? "Llegando" : `${arrival.waitMinutes} min`}
                            </Text>

                            {/* Fila de horas */}
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 4,
                                marginTop: 2,
                              }}
                            >
                              {/* Hora teórica tachada — solo si hay delay */}
                              {arrival.isRealtime &&
                                arrival.delayMinutes !== undefined &&
                                arrival.delayMinutes !== 0 &&
                                arrival.scheduledTimeSeconds !== undefined && (
                                  <Text
                                    style={{
                                      fontSize: 11,
                                      color: "#9ca3af",
                                      textDecorationLine: "line-through",
                                    }}
                                  >
                                    {formatArrivalTime(arrival.scheduledTimeSeconds)}
                                  </Text>
                                )}

                              {/* Hora real (o teórica si no hay realtime) */}
                              <Text
                                style={{
                                  fontSize: 12,
                                  color: delayColor,
                                  fontWeight: arrival.isRealtime ? "600" : "400",
                                }}
                              >
                                {formatArrivalTime(arrival.departureTimeSeconds)}
                              </Text>
                            </View>

                            {/* "A tiempo" si es realtime sin delay */}
                            {arrival.isRealtime && arrival.delayMinutes === 0 && (
                              <Text style={{ fontSize: 10, color: "#16a34a", marginTop: 1 }}>
                                A tiempo
                              </Text>
                            )}
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

StopBottomSheet.displayName = "StopBottomSheet";
