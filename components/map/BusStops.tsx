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
  onStopPress?: (stop: Stop) => void;
}

export function BusStops({ stops, onStopPress }: Props) {
  return (
    <>
      {stops.map((stop) => (
        <Marker
          key={stop.id}
          coordinate={{
            latitude: stop.latitude,
            longitude: stop.longitude,
          }}
          title={stop.name}
          onPress={() => onStopPress?.(stop)}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: "white",
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#d1d5db",
            }}
          >
            <MaterialCommunityIcons name="bus-stop" size={16} color="#2563eb" />
          </View>
        </Marker>
      ))}
    </>
  );
}
