import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { forwardRef, useMemo } from "react";
import { Pressable, Text, View } from "react-native";

import { RouteCandidate } from "@/utils/routing/offlineRouter";

interface Props {
  routes: RouteCandidate[];
  onSelectRoute: (route: RouteCandidate) => void;
}

export const RouteOptionsBottomSheet = forwardRef<BottomSheet, Props>(
  ({ routes, onSelectRoute }, ref) => {
    const snapPoints = useMemo(() => ["30%", "60%"], []);

    return (
      <BottomSheet ref={ref} index={-1} snapPoints={snapPoints} enablePanDownToClose>
        <BottomSheetFlatList
          data={routes}
          keyExtractor={(_, index) => String(index)}
          renderItem={({ item, index }) => {
            const buses = item.steps.filter((s) => s.type === "bus").map((s) => s.routeId);

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
                      ⭐ Recomendada
                    </Text>
                  )}

                  <Text style={{ fontWeight: "600" }}>{buses.join(" → ")}</Text>
                </View>

                <Text style={{ color: "#6b7280" }}>Score: {Math.round(item.score)}</Text>
              </Pressable>
            );
          }}
        />
      </BottomSheet>
    );
  }
);
