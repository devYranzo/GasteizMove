import { MaterialCommunityIcons } from "@expo/vector-icons";
import { View } from "react-native";
import { Marker } from "react-native-maps";

interface Bus {
  id: string;
  latitude: number;
  longitude: number;
  routeId: string;
  bearing?: number;
}

interface Props {
  buses: Bus[];
}

export function LiveBuses({ buses }: Props) {
  if (!Array.isArray(buses)) return null;

  return (
    <>
      {buses.map((bus) => (
        <Marker
          key={bus.id}
          coordinate={{
            latitude: bus.latitude,
            longitude: bus.longitude,
          }}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: "limegreen",
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 1,
            }}
          >
            <MaterialCommunityIcons name="bus" size={16} color="white" />
          </View>
        </Marker>
      ))}
    </>
  );
}
