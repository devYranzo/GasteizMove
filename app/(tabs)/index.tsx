import { useState } from "react";
import { Text } from "react-native";
import MapView from "react-native-maps";

import { View } from "@/components/Themed";
import { BusStops, Stop } from "@/components/map/BusStops";

import stops from "@/data/gtfs/stops.json";

export default function TabOneScreen() {
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: 42.846,
          longitude: -2.673,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        <BusStops stops={stops} onStopPress={setSelectedStop} />
      </MapView>

      {selectedStop && (
        <View
          style={{
            position: "absolute",
            bottom: 20,
            left: 20,
            right: 20,
            backgroundColor: "white",
            padding: 16,
            borderRadius: 12,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              marginBottom: 8,
            }}
          >
            {selectedStop.name}
          </Text>

          {selectedStop.routes.map((route) => (
            <Text key={route.id}>Línea {route.name}</Text>
          ))}
        </View>
      )}
    </View>
  );
}
