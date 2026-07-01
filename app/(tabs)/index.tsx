import { MaterialIcons } from "@expo/vector-icons";
import BottomSheet from "@gorhom/bottom-sheet";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, TouchableOpacity, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

import { ActiveRouteBottomSheet } from "@/components/bottom-sheet/ActiveRouteBottomSheet";
import { RouteOptionsBottomSheet } from "@/components/bottom-sheet/RouteOptionsBottomSheet";
import { StopBottomSheet } from "@/components/bottom-sheet/StopBottomSheet";
import { LiveVehicles } from "@/components/map/LiveVehicles";
import { RouteLines } from "@/components/map/RouteLines";
import { RoutePlanOverlay } from "@/components/map/RoutePlanOverlay";
import { SearchBar } from "@/components/map/SearchBar";
import { SearchResult, SearchResults } from "@/components/map/SearchResults";
import { Stop, TransitStops } from "@/components/map/TransitStops";

import streets from "@/data/streets.json";

import {
  getTransitRouteColorMap,
  getTransitStops,
} from "@/services/transit/transitRepository";
import {
  HomeWorkLocation,
  loadHomeWork,
  subscribeHomeWork,
} from "@/storage/homeWorkStorage";
import { TransitVehicle } from "@/types/transit";

import {
  getNextArrivalsForStop,
  StopArrival,
} from "@/utils/arrivals/stopArrivals";
import {
  findRoute,
  RouteCandidate,
  RouteStep,
  TransitStep,
} from "@/utils/routing/offlineRouter";

export default function TabOneScreen() {
  const stops = getTransitStops();
  const { stopId, routeDestLat, routeDestLng, routeDestName } =
    useLocalSearchParams<{
      stopId?: string;
      routeDestLat?: string;
      routeDestLng?: string;
      routeDestName?: string;
    }>();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<TransitVehicle[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedStreet, setSelectedStreet] = useState<{
    latitude: number;
    longitude: number;
    name: string;
  } | null>(null);

  const [homeLoc, setHomeLoc] = useState<HomeWorkLocation | undefined>(
    undefined,
  );
  const [workLoc, setWorkLoc] = useState<HomeWorkLocation | undefined>(
    undefined,
  );

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
  const [activeRouteDest, setActiveRouteDest] = useState<{
    lat: number;
    lng: number;
    name: string;
  } | null>(null);

  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const routeSheetRef = useRef<BottomSheet>(null);

  const [selectedRoute, setSelectedRoute] = useState<RouteCandidate | null>(
    null,
  );
  const [sheetIndex, setSheetIndex] = useState(-1);
  const [navigationActive, setNavigationActive] = useState(false);
  const closingAfterSelectionRef = useRef(false);
  const [arrivals, setArrivals] = useState<StopArrival[]>([]);
  const [arrivalsLoading, setArrivalsLoading] = useState(false);

  // ── Helper para cargar llegadas (evita duplicar lógica async) ─────────────
  async function loadArrivals(stop: Stop) {
    setArrivalsLoading(true);
    try {
      const data = await getNextArrivalsForStop(stop.id);
      setArrivals(data);
    } finally {
      setArrivalsLoading(false);
    }
  }

  useEffect(() => {
    const unsubscribe = subscribeHomeWork((store) => {
      setHomeLoc(store.home);
      setWorkLoc(store.work);
    });
    loadHomeWork().then((store) => {
      setHomeLoc(store.home);
      setWorkLoc(store.work);
    });
    return () => unsubscribe();
  }, []);

  // ── Navegar a parada desde favoritos ──────────────────────────────────────
  useEffect(() => {
    if (!stopId || !initialRegion) return;
    const stop = stops.find((s) => s.id === stopId);
    if (!stop) return;

    router.setParams({ stopId: "" });
    mapRef.current?.animateToRegion(
      {
        latitude: stop.latitude,
        longitude: stop.longitude,
        latitudeDelta: 0.003,
        longitudeDelta: 0.003,
      },
      600,
    );
    setSelectedStop(stop);
    setSelectedRouteId(null);
    setSelectedStreet(null);
    loadArrivals(stop);
    bottomSheetRef.current?.snapToIndex(0);
  }, [stopId, initialRegion]);

  // ── Recalcular ruta desde favoritos ───────────────────────────────────────
  useEffect(() => {
    if (!routeDestLat || !routeDestLng || !initialRegion) return;
    const destLat = parseFloat(routeDestLat);
    const destLng = parseFloat(routeDestLng);
    if (isNaN(destLat) || isNaN(destLng)) return;

    router.setParams({ routeDestLat: "", routeDestLng: "", routeDestName: "" });
    calculateRoute({
      latitude: destLat,
      longitude: destLng,
      name: routeDestName ?? "",
    });
  }, [routeDestLat, routeDestLng, initialRegion]);

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
      500,
    );
  }

  const visibleStopIds = useMemo(() => {
    const ids = stops
      .filter((stop) => {
        if (selectedRouteId)
          return stop.routes.some((r) => r.id === selectedRouteId);
        if (!visibleRegion) return false;
        const latOk =
          Math.abs(stop.latitude - visibleRegion.latitude) <
          visibleRegion.latitudeDelta / 2;
        const lngOk =
          Math.abs(stop.longitude - visibleRegion.longitude) <
          visibleRegion.longitudeDelta / 2;
        return latOk && lngOk;
      })
      .map((s) => s.id);
    return new Set(ids);
  }, [selectedRouteId, visibleRegion]);

  const routeColorMap = useMemo(() => {
    return getTransitRouteColorMap();
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
        const uniqueRoutes = Array.from(
          new Map(stop.routes.map((r) => [r.id, r])).values(),
        );
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
          street.nameEs.toLowerCase().includes(query) ||
          street.nameEu.toLowerCase().includes(query),
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
      if (step.type === "transit") {
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
    setArrivals([]);
    loadArrivals(stop);
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
    setRoutePlanVersion((v) => v + 1);
    setRouteOptions([]);
    setSelectedRouteId(null);
    setSelectedStreet(null);
    setActiveRouteDest(null);
    setVehicles([]);
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
      setVehicles([]);
      return;
    }
    let interval: any;
    const fetchVehicles = async () => {
      try {
        const res = await fetch(
          `http://192.168.50.10:3000/api/buses?routeId=${selectedRouteId}`,
        );
        const data = await res.json();
        setVehicles(Array.isArray(data) ? data : []);
      } catch {
        setVehicles([]);
      }
    };
    fetchVehicles();
    interval = setInterval(fetchVehicles, 6000);
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
        500,
      );
      setSelectedStop(stop);
      setSearch("");
      setArrivals([]);
      loadArrivals(stop);
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
        500,
      );
      setSelectedStop(null);
      setSelectedRouteId(null);
      setSearch("");
      calculateRoute({
        latitude: result.latitude,
        longitude: result.longitude,
        name: result.name,
      });
    }
  }

  function handleQuickLocationPress(location: HomeWorkLocation) {
    setSelectedStreet({
      latitude: location.lat,
      longitude: location.lng,
      name: location.name,
    });
    mapRef.current?.animateToRegion(
      {
        latitude: location.lat,
        longitude: location.lng,
        latitudeDelta: 0.006,
        longitudeDelta: 0.006,
      },
      500,
    );
    setSelectedStop(null);
    setSelectedRouteId(null);
    setSearch("");
    calculateRoute({
      latitude: location.lat,
      longitude: location.lng,
      name: location.name,
    });
  }

  if (!initialRegion) return <View style={{ flex: 1 }} />;

  async function calculateRoute(destination: {
    latitude: number;
    longitude: number;
    name: string;
  }) {
    setRoutePlan([]);
    setRoutePlanVersion((v) => v + 1);
    setRouteOptions([]);
    setSelectedRouteId(null);
    setSelectedRoute(null);
    setVehicles([]);
    setActiveRouteDest({
      lat: destination.latitude,
      lng: destination.longitude,
      name: destination.name,
    });

    const location = await Location.getCurrentPositionAsync({});
    const routes = findRoute(
      location.coords.latitude,
      location.coords.longitude,
      destination.latitude,
      destination.longitude,
    );
    if (!routes.length) return;

    setRouteOptions(routes);
    setRoutePlan(routes[0].steps);
    setRoutePlanVersion((v) => v + 1);
    setNavigationActive(true);
    routeSheetRef.current?.snapToIndex(0);
  }

  function handleSelectRoute(route: RouteCandidate) {
    setSelectedRoute(route);
    setRoutePlan(route.steps);
    setRoutePlanVersion((v) => v + 1);
    setNavigationActive(true);

    const firstTransit = route.steps.find(
      (s): s is TransitStep => s.type === "transit",
    );
    if (firstTransit) setSelectedRouteId(firstTransit.routeId);

    const points = route.steps.flatMap((step) =>
      step.type === "transit"
        ? step.shapeCoords
        : [
            { latitude: step.fromLat, longitude: step.fromLng },
            { latitude: step.toLat, longitude: step.toLng },
          ],
    );
    mapRef.current?.fitToCoordinates(points, {
      edgePadding: { top: 120, right: 60, bottom: 250, left: 60 },
      animated: true,
    });

    closingAfterSelectionRef.current = true;
    routeSheetRef.current?.close();
  }

  return (
    <View style={{ flex: 1 }}>
      <SearchBar
        value={search}
        onChangeText={setSearch}
        homeLocation={homeLoc}
        workLocation={workLoc}
        onPressLocation={handleQuickLocationPress}
      />

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
        <RouteLines
          selectedRouteId={navigationActive ? null : selectedRouteId}
        />
        <TransitStops
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
        <LiveVehicles vehicles={vehicles} />
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
        arrivals={arrivals}
        arrivalsLoading={arrivalsLoading}
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

      {selectedRoute && activeRouteDest && (
        <ActiveRouteBottomSheet
          route={selectedRoute}
          onClearRoute={handleClearRoute}
          destLat={activeRouteDest.lat}
          destLng={activeRouteDest.lng}
          destName={activeRouteDest.name}
        />
      )}
    </View>
  );
}
