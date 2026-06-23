import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { forwardRef, useMemo, useState } from "react";
import { Pressable, Text, TouchableOpacity, View } from "react-native";

import { StopArrival } from "@/utils/arrivals/stopArrivals";

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

                {selectedRouteId && (
                  <TouchableOpacity
                    onPress={onClearRoute}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 4,
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

                <TouchableOpacity
                  onPress={onClose}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 24,
                      fontWeight: "600",
                      color: "#6b7280",
                    }}
                  >
                    ×
                  </Text>
                </TouchableOpacity>
              </View>

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
                  const id = `${arrival.routeId}-${arrival.directionId}`;
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

                        <View
                          style={{
                            flex: 1,
                          }}
                        >
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

                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "700",
                            color: "#2563eb",
                            marginLeft: 12,
                          }}
                        >
                          {arrival.waitMinutes} min
                        </Text>
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
