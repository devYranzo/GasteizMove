import { MaterialIcons } from "@expo/vector-icons";
import BottomSheet from "@gorhom/bottom-sheet";
import * as Location from "expo-location";
import { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, TouchableOpacity } from "react-native";
import MapView, { Marker } from "react-native-maps";

import { View } from "@/components/Themed";
import { StopBottomSheet } from "@/components/bottom-sheet/StopBottomSheet";
import { BusStops, Stop } from "@/components/map/BusStops";
import { LiveBuses } from "@/components/map/LiveBuses";
import { RouteLines } from "@/components/map/RouteLines";
import { SearchBar } from "@/components/map/SearchBar";
import { SearchResult, SearchResults } from "@/components/map/SearchResults";

import routesData from "@/data/gtfs/routes.json";
import stops from "@/data/gtfs/stops.json";
import streets from "@/data/streets.json";

import { ActiveRouteBottomSheet } from "@/components/bottom-sheet/ActiveRouteBottomSheet";
import { RouteOptionsBottomSheet } from "@/components/bottom-sheet/RouteOptionsBottomSheet";
import { RoutePlanOverlay } from "@/components/map/RoutePlanOverlay";
import { findRoute, RouteCandidate, RouteStep } from "@/utils/routing/offlineRouter";

export default function TabOneScreen() {
  const [search, setSearch] = useState("");
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [buses, setBuses] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedStreet, setSelectedStreet] = useState<{
    latitude: number;
    longitude: number;
    name: string;
  } | null>(null);

  const [visibleRegion, setVisibleRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);

  const [initialRegion, setInitialRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);

  const [routeOptions, setRouteOptions] = useState<RouteCandidate[]>([]);
  const [routePlan, setRoutePlan] = useState<RouteStep[]>([]);
  const [routePlanVersion, setRoutePlanVersion] = useState(0);

  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const routeSheetRef = useRef<BottomSheet>(null);

  const [selectedRoute, setSelectedRoute] = useState<RouteCandidate | null>(null);

  const [sheetIndex, setSheetIndex] = useState(-1);
  const [navigationActive, setNavigationActive] = useState(false);
  const closingAfterSelectionRef = useRef(false);

  useEffect(() => {
    async function getLocation() {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === "granted") {
        const location = await Location.getCurrentPositionAsync({});

        setInitialRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.006,
          longitudeDelta: 0.006,
        });

        return;
      }

      setInitialRegion({
        latitude: 42.846,
        longitude: -2.673,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }

    getLocation();
  }, []);

  async function centerOnUser() {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") return;

    const location = await Location.getCurrentPositionAsync({});

    mapRef.current?.animateToRegion(
      {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.006,
        longitudeDelta: 0.006,
      },
      500
    );
  }

  const visibleStopIds = useMemo(() => {
    const ids = stops
      .filter((stop) => {
        if (selectedRouteId) {
          return stop.routes.some((r) => r.id === selectedRouteId);
        }

        if (!visibleRegion) return false;

        const latOk =
          Math.abs(stop.latitude - visibleRegion.latitude) < visibleRegion.latitudeDelta / 2;

        const lngOk =
          Math.abs(stop.longitude - visibleRegion.longitude) < visibleRegion.longitudeDelta / 2;

        return latOk && lngOk;
      })
      .map((s) => s.id);

    return new Set(ids);
  }, [selectedRouteId, visibleRegion]);

  const routeColorMap = useMemo(() => {
    const map: Record<string, string> = {};

    routesData.forEach((route) => {
      map[route.routeId] = `#${route.color}`;
    });

    return map;
  }, []);

  useEffect(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      setSearchResults([]);
      return;
    }

    const stopResults: SearchResult[] = stops
      .filter((stop) => stop.name.toLowerCase().includes(query))
      .slice(0, 10)
      .map((stop) => {
        const uniqueRoutes = Array.from(new Map(stop.routes.map((r) => [r.id, r])).values());

        return {
          id: stop.id,
          name: stop.name,
          type: "stop",
          routes: uniqueRoutes.map((r) => ({
            id: r.id,
            name: r.name,
            color: routeColorMap[r.id] ?? "#9ca3af",
          })),
        };
      });

    const streetResults: SearchResult[] = streets
      .filter(
        (street) =>
          street.nameEs.toLowerCase().includes(query) || street.nameEu.toLowerCase().includes(query)
      )
      .slice(0, 10)
      .map((street) => ({
        id: `street-${street.latitude}-${street.longitude}`,
        name: street.nameEs,
        type: "street",
        latitude: street.latitude,
        longitude: street.longitude,
      }));

    setSearchResults([...stopResults, ...streetResults]);
  }, [search]);

  const navigationStopIds = useMemo(() => {
    const ids = new Set<string>();

    routePlan.forEach((step) => {
      if (step.type === "bus") {
        ids.add(step.fromStopId);
        ids.add(step.toStopId);
      }
    });

    return ids;
  }, [routePlan]);

  function handleStopPress(stop: Stop) {
    Keyboard.dismiss();

    setSelectedStop(stop);
    setSelectedRouteId(null);
    setSelectedStreet(null);

    bottomSheetRef.current?.snapToIndex(0);
  }

  function handleRoutePress(routeId: string) {
    Keyboard.dismiss();

    setSelectedRouteId(routeId);
    setSearch("");
    setSelectedStreet(null);
  }

  function handleClearRoute() {
    closingAfterSelectionRef.current = false;
    setSelectedRoute(null);

    setNavigationActive(false);
    setRoutePlan([]);
    setRoutePlanVersion((version) => version + 1);
    setRouteOptions([]);
    setSelectedRouteId(null);
    setSelectedStreet(null);
    setBuses([]);

    routeSheetRef.current?.close();
  }

  function handleSheetChange(index: number) {
    setSheetIndex(index);

    if (index === -1) {
      setSelectedRouteId(null);
      setSelectedStop(null);
      setSearch("");
      setSelectedStreet(null);
      setRoutePlan([]);
      setRouteOptions([]);
      setNavigationActive(false);
    }
  }

  function handleCloseSheet() {
    bottomSheetRef.current?.close();
  }

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
          setBuses([]);
        }
      } catch (error) {
        console.log("Error buses:", error);
        setBuses([]);
      }
    };

    fetchBuses();

    interval = setInterval(fetchBuses, 6000);

    return () => clearInterval(interval);
  }, [selectedRouteId]);

  function handleSearchResultPress(result: SearchResult) {
    Keyboard.dismiss();

    if (result.type === "stop") {
      const stop = stops.find((s) => s.id === result.id);

      if (!stop) return;

      setSelectedStreet(null);

      mapRef.current?.animateToRegion(
        {
          latitude: stop.latitude,
          longitude: stop.longitude,
          latitudeDelta: 0.003,
          longitudeDelta: 0.003,
        },
        500
      );

      setSelectedStop(stop);
      setSearch("");

      bottomSheetRef.current?.snapToIndex(0);

      return;
    }

    if (
      result.type === "street" &&
      result.latitude !== undefined &&
      result.longitude !== undefined
    ) {
      setSelectedStreet({
        latitude: result.latitude,
        longitude: result.longitude,
        name: result.name,
      });

      mapRef.current?.animateToRegion(
        {
          latitude: result.latitude,
          longitude: result.longitude,
          latitudeDelta: 0.006,
          longitudeDelta: 0.006,
        },
        500
      );

      setSelectedStop(null);
      setSelectedRouteId(null);
      setSearch("");

      calculateRoute({
        latitude: result.latitude!,
        longitude: result.longitude!,
      });
    }
  }

  if (!initialRegion) {
    return <View style={{ flex: 1 }} />;
  }

  async function calculateRoute(destination: { latitude: number; longitude: number }) {
    setRoutePlan([]);
    setRoutePlanVersion((version) => version + 1);
    setRouteOptions([]);
    setSelectedRouteId(null);
    setSelectedRoute(null);
    setBuses([]);

    const location = await Location.getCurrentPositionAsync({});

    const routes = findRoute(
      location.coords.latitude,
      location.coords.longitude,
      destination.latitude,
      destination.longitude
    );

    if (!routes.length) return;

    setRouteOptions(routes);
    setRoutePlan(routes[0].steps);
    setRoutePlanVersion((version) => version + 1);
    setNavigationActive(true);

    routeSheetRef.current?.snapToIndex(0);
  }

  function handleSelectRoute(route: RouteCandidate) {
    setSelectedRoute(route);
    setRoutePlan(route.steps);
    setRoutePlanVersion((version) => version + 1);
    setNavigationActive(true);

    const firstBus = route.steps.find(
      (s): s is Extract<RouteStep, { type: "bus" }> => s.type === "bus"
    );

    if (firstBus) {
      setSelectedRouteId(firstBus.routeId);
    }

    const points = route.steps.flatMap((step) =>
      step.type === "bus"
        ? step.shapeCoords
        : [
            {
              latitude: step.fromLat,
              longitude: step.fromLng,
            },
            {
              latitude: step.toLat,
              longitude: step.toLng,
            },
          ]
    );

    mapRef.current?.fitToCoordinates(points, {
      edgePadding: {
        top: 120,
        right: 60,
        bottom: 250,
        left: 60,
      },
      animated: true,
    });

    closingAfterSelectionRef.current = true;

    routeSheetRef.current?.close();
  }

  return (
    <View style={{ flex: 1 }}>
      <SearchBar value={search} onChangeText={setSearch} />

      <SearchResults
        visible={search.trim().length > 0}
        results={searchResults}
        onPress={handleSearchResultPress}
      />

      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={initialRegion}
        showsUserLocation
        onPress={() => Keyboard.dismiss()}
        onRegionChangeComplete={(region) => setVisibleRegion(region)}
      >
        <RouteLines selectedRouteId={navigationActive ? null : selectedRouteId} />

        <BusStops
          stops={stops}
          visibleStopIds={navigationActive ? navigationStopIds : visibleStopIds}
          selectedStopId={selectedStop?.id ?? null}
          onStopPress={handleStopPress}
        />

        {navigationActive && (
          <RoutePlanOverlay
            key={`route-plan-${routePlanVersion}`}
            routePlan={routePlan}
            version={routePlanVersion}
          />
        )}

        <LiveBuses buses={buses} />

        {selectedStreet && (
          <Marker
            coordinate={{
              latitude: selectedStreet.latitude,
              longitude: selectedStreet.longitude,
            }}
          >
            <MaterialIcons name="location-pin" size={40} color="red" />
          </Marker>
        )}
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

      <RouteOptionsBottomSheet
        ref={routeSheetRef}
        routes={routeOptions}
        onSelectRoute={handleSelectRoute}
        onClose={() => {
          if (closingAfterSelectionRef.current) {
            closingAfterSelectionRef.current = false;
            return;
          }

          handleClearRoute();
        }}
      />

      {selectedRoute && (
        <ActiveRouteBottomSheet route={selectedRoute} onClearRoute={handleClearRoute} />
      )}
    </View>
  );
}
