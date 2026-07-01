import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  getTransitModeColor,
  getTransitModeForRoute,
} from "@/services/transit/transitModes";
import { TransitMode, TransitVehicle } from "@/types/transit";
import { useEffect, useRef } from "react";
import { View } from "react-native";
import { Marker } from "react-native-maps";

interface Props {
  vehicles: TransitVehicle[];
}

function getVehicleIcon(mode: TransitMode) {
  if (mode === "tram") return "train";
  return "bus";
}

function LiveVehicleMarker({ vehicle }: { vehicle: TransitVehicle }) {
  const markerRef = useRef<any>(null);

  const currentPos = useRef({
    latitude: vehicle.latitude,
    longitude: vehicle.longitude,
  });

  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const startLat = currentPos.current.latitude;
    const startLng = currentPos.current.longitude;
    const endLat = vehicle.latitude;
    const endLng = vehicle.longitude;

    if (startLat === endLat && startLng === endLng) return;

    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }

    const duration = 1500;
    const startTime = performance.now();

    function easeOut(t: number) {
      return 1 - Math.pow(1 - t, 2);
    }

    function animate(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const easedT = easeOut(t);

      const lat = startLat + (endLat - startLat) * easedT;
      const lng = startLng + (endLng - startLng) * easedT;

      currentPos.current = { latitude: lat, longitude: lng };

      markerRef.current?.setNativeProps({
        coordinate: { latitude: lat, longitude: lng },
      });

      if (t < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
      }
    }

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [vehicle.latitude, vehicle.longitude]);

  const mode = vehicle.mode ?? getTransitModeForRoute(vehicle.routeId);
  const color = getTransitModeColor(mode);

  return (
    <Marker
      ref={markerRef}
      coordinate={{
        latitude: vehicle.latitude,
        longitude: vehicle.longitude,
      }}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 0.5 }}
      flat={true}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: color,
          justifyContent: "center",
          alignItems: "center",
          borderWidth: 1,
          borderColor: "white",
        }}
      >
        <MaterialCommunityIcons
          name={getVehicleIcon(mode)}
          size={16}
          color="white"
        />
      </View>
    </Marker>
  );
}

export function LiveVehicles({ vehicles }: Props) {
  if (!Array.isArray(vehicles)) return null;

  return (
    <>
      {vehicles.map((vehicle) => (
        <LiveVehicleMarker key={vehicle.id} vehicle={vehicle} />
      ))}
    </>
  );
}
