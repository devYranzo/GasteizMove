import { MaterialCommunityIcons } from "@expo/vector-icons";
import { View } from "react-native";
import { Marker } from "react-native-maps";

export type Stop = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  routes: { id: string; name: string }[];
};

interface Props {
  stops: Stop[];
  visibleStopIds: Set<string>;
  selectedStopId: string | null;
  onStopPress?: (stop: Stop) => void;
}

export function BusStops({ stops, visibleStopIds, selectedStopId, onStopPress }: Props) {
  return (
    <>
      {stops.map((stop) => {
        const isSelected = stop.id === selectedStopId;
        const isVisible = visibleStopIds.has(stop.id);

        return (
          <Marker
            key={stop.id}
            coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
            onPress={() => isVisible && onStopPress?.(stop)}
            opacity={isVisible ? 1 : 0}
            tappable={isVisible}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: isSelected ? "#3e5d58" : "white",
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 1,
                borderColor: isSelected ? "#3e5d58" : "#d1d5db",
              }}
            >
              <MaterialCommunityIcons
                name="bus-stop"
                size={16}
                color={isSelected ? "white" : "#3e5d58"}
              />
            </View>
          </Marker>
        );
      })}
    </>
  );
}
