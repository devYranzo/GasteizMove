import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { TouchableOpacity } from "react-native";
import MapView from "react-native-maps";

import BottomSheet from "@gorhom/bottom-sheet";
import * as Location from "expo-location";

import { View } from "@/components/Themed";
import { StopBottomSheet } from "@/components/bottom-sheet/StopBottomSheet";
import { BusStops, Stop } from "@/components/map/BusStops";
import { LiveBuses } from "@/components/map/LiveBuses";
import { RouteLines } from "@/components/map/RouteLines";
import { SearchBar } from "@/components/map/SearchBar";

import stops from "@/data/gtfs/stops.json";

export default function TabOneScreen() {
  const [search, setSearch] = useState("");
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [buses, setBuses] = useState<any[]>([]);

  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [sheetIndex, setSheetIndex] = useState(-1);

  // User Location
  async function centerOnUser() {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") return;

    const location = await Location.getCurrentPositionAsync({});

    mapRef.current?.animateToRegion(
      {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      500
    );
  }

  // Handlers
  function handleStopPress(stop: Stop) {
    setSelectedStop(stop);
    setSelectedRouteId(null);

    bottomSheetRef.current?.snapToIndex(0);
  }

  function handleRoutePress(routeId: string) {
    setSelectedRouteId(routeId);
  }

  function handleClearRoute() {
    setSelectedRouteId(null);
  }

  function handleSheetChange(index: number) {
    setSheetIndex(index);

    if (index === -1) {
      setSelectedRouteId(null);
    }
  }

  function handleCloseSheet() {
    bottomSheetRef.current?.close();
  }

  // Filter stops based on search
  const filteredStops = stops.filter((stop) =>
    stop.name.toLowerCase().includes(search.toLowerCase())
  );

  // Fetch buses every 6 seconds when a route is selected
  useEffect(() => {
    if (!selectedRouteId) {
      setBuses([]);
      return;
    }

    let interval: any;

    const fetchBuses = async () => {
      try {
        const res = await fetch(`http://192.168.50.10:3000/api/buses?routeId=${selectedRouteId}`);

        const data = await res.json();

        if (Array.isArray(data)) {
          setBuses(data);
        } else {
          console.warn("API no devolvió array:", data);
          setBuses([]);
        }
      } catch (e) {
        console.log("Error buses:", e);
        setBuses([]);
      }
    };

    fetchBuses();

    interval = setInterval(fetchBuses, 6000);

    return () => clearInterval(interval);
  }, [selectedRouteId]);

  return (
    <View style={{ flex: 1 }}>
      <SearchBar value={search} onChangeText={setSearch} />
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: 42.846,
          longitude: -2.673,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        ref={mapRef}
        showsUserLocation
      >
        <RouteLines selectedRouteId={selectedRouteId} />
        <BusStops
          stops={filteredStops}
          selectedStopId={selectedStop?.id ?? null}
          selectedRouteId={selectedRouteId}
          onStopPress={handleStopPress}
        />
        <LiveBuses buses={buses} />
      </MapView>

      <TouchableOpacity
        onPress={centerOnUser}
        style={{
          position: "absolute",
          right: 20,
          bottom: sheetIndex === -1 ? 30 : sheetIndex === 0 ? 150 : 350,

          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: "white",
          justifyContent: "center",
          alignItems: "center",
          shadowColor: "#000",
          shadowOpacity: 0.2,
          shadowRadius: 6,
          elevation: 5,
        }}
      >
        <MaterialIcons name="my-location" size={24} color="#2563eb" />
      </TouchableOpacity>

      <StopBottomSheet
        ref={bottomSheetRef}
        stop={selectedStop}
        onChange={handleSheetChange}
        onRoutePress={handleRoutePress}
        onClearRoute={handleClearRoute}
        onClose={handleCloseSheet}
        selectedRouteId={selectedRouteId}
      />
    </View>
  );
}
