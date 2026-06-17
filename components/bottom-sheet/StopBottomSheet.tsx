import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { forwardRef, useMemo, useState } from "react";
import { Pressable, Text, TouchableOpacity, View } from "react-native";

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
  onChange?: (index: number) => void;
  onRoutePress?: (routeId: string) => void;
  onClearRoute?: () => void;
  onClose?: () => void;
  selectedRouteId?: string | null;
}
export const StopBottomSheet = forwardRef<BottomSheet, Props>(
  ({ stop, onChange, onRoutePress, onClearRoute, onClose, selectedRouteId }, ref) => {
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

              <View>
                {stop.routes.map((route) => {
                  const isPressed = pressedId === route.id;

                  return (
                    <Pressable
                      key={route.id}
                      onPress={() => onRoutePress?.(route.id)}
                      onPressIn={() => setPressedId(route.id)}
                      onPressOut={() => setPressedId(null)}
                      style={{
                        paddingVertical: 18,
                        paddingHorizontal: 14,
                        marginBottom: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: "#eee",
                        backgroundColor: isPressed ? "#f3f4f6" : "white",
                        minHeight: 52,
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                        }}
                      >
                        Línea {route.name}
                      </Text>
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
