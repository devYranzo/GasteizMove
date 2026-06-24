import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { forwardRef, useMemo, useState } from "react";
import { Pressable, Text, TouchableOpacity, View } from "react-native";

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
  onChange?: (index: number) => void;
  onRoutePress?: (routeId: string) => void;
  onClearRoute?: () => void;
  onClose?: () => void;
  selectedRouteId?: string | null;
}

export const StopBottomSheet = forwardRef<BottomSheet, Props>(
  ({ stop, arrivals, onChange, onRoutePress, onClearRoute, onClose, selectedRouteId }, ref) => {
    const snapPoints = useMemo(() => ["25%", "50%"], []);
    const [pressedId, setPressedId] = useState<string | null>(null);

    const { favorites, addFavorite, removeFavorite } = useFavorites();

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
        <BottomSheetView
          style={{
            flex: 1,
            paddingHorizontal: 20,
            paddingTop: 12,
          }}
        >
          {stop && (
            <>
              {/* HEADER */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 18,
                }}
              >
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: "600",
                    flex: 1,
                  }}
                >
                  {stop.name}
                </Text>

                {/* ⭐ FAVORITO */}
                <FavoriteButton id={stop.id} title={stop.name} type="stop" />

                {/* ↺ limpiar ruta */}
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
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: "700",
                        color: "#2563eb",
                      }}
                    >
                      ↺
                    </Text>
                  </TouchableOpacity>
                )}

                {/* ❌ cerrar */}
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

              {/* RESTO IGUAL */}
              <Text
                style={{
                  fontSize: 14,
                  color: "#6b7280",
                  marginBottom: 12,
                  fontWeight: "500",
                }}
              >
                Próximas llegadas
              </Text>

              <View>
                {arrivals.length === 0 && (
                  <Text
                    style={{
                      color: "#6b7280",
                      textAlign: "center",
                      marginTop: 20,
                    }}
                  >
                    No hay próximas salidas disponibles
                  </Text>
                )}

                {arrivals.map((arrival) => {
                  const id = `${arrival.routeId}-${arrival.directionId}-${arrival.departureTimeSeconds}`;
                  const isPressed = pressedId === id;

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
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        <View
                          style={{
                            backgroundColor: arrival.routeColor,
                            borderRadius: 8,
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            marginRight: 12,
                          }}
                        >
                          <Text
                            style={{
                              color: "white",
                              fontWeight: "700",
                              fontSize: 14,
                            }}
                          >
                            {arrival.routeName}
                          </Text>
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text
                            numberOfLines={1}
                            style={{
                              fontSize: 15,
                              fontWeight: "500",
                            }}
                          >
                            {arrival.destination}
                          </Text>
                        </View>

                        <View
                          style={{
                            alignItems: "flex-end",
                            marginLeft: 12,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: "700",
                              color: "#2563eb",
                            }}
                          >
                            {arrival.waitMinutes <= 0 ? "Llegando" : `${arrival.waitMinutes} min`}
                          </Text>

                          <Text
                            style={{
                              fontSize: 12,
                              color: "#6b7280",
                              marginTop: 2,
                            }}
                          >
                            {formatArrivalTime(arrival.departureTimeSeconds)}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

StopBottomSheet.displayName = "StopBottomSheet";
