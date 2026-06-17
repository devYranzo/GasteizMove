import { MaterialCommunityIcons } from "@expo/vector-icons";
import { View } from "react-native";
import { Marker } from "react-native-maps";

export type Stop = {
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
  stops: Stop[];
  selectedStopId: string | null;
  selectedRouteId: string | null;
  onStopPress?: (stop: Stop) => void;
}

export function BusStops({ stops, selectedStopId, selectedRouteId, onStopPress }: Props) {
  const visibleStops =
    selectedRouteId !== null ? stops.filter((stop) => stop.id === selectedStopId) : stops;

  console.log({
    selectedStopId,
    selectedRouteId,
  });

  return (
    <>
      {visibleStops.map((stop) => {
        const isSelected = stop.id === selectedStopId;

        return (
          <Marker
            key={`${stop.id}-${selectedRouteId ? "route" : "all"}`}
            coordinate={{
              latitude: stop.latitude,
              longitude: stop.longitude,
            }}
            onPress={() => onStopPress?.(stop)}
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
