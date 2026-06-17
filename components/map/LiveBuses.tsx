import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
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

function BusMarker({ bus }: { bus: Bus }) {
  const markerRef = useRef<any>(null);

  // Posición actual real del marcador
  const currentPos = useRef({
    latitude: bus.latitude,
    longitude: bus.longitude,
  });

  // Animación en curso
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const startLat = currentPos.current.latitude;
    const startLng = currentPos.current.longitude;
    const endLat = bus.latitude;
    const endLng = bus.longitude;

    // Si no hay cambio real, no animar
    if (startLat === endLat && startLng === endLng) return;

    // Cancelar animación previa si aún corre
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

      // Mover el marker nativo directamente sin re-render de React
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
  }, [bus.latitude, bus.longitude]);

  return (
    <Marker
      ref={markerRef}
      coordinate={{
        latitude: bus.latitude,
        longitude: bus.longitude,
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
          backgroundColor: "limegreen",
          justifyContent: "center",
          alignItems: "center",
          borderWidth: 1,
          borderColor: "white",
        }}
      >
        <MaterialCommunityIcons name="bus" size={16} color="white" />
      </View>
    </Marker>
  );
}

export function LiveBuses({ buses }: Props) {
  if (!Array.isArray(buses)) return null;

  return (
    <>
      {buses.map((bus) => (
        <BusMarker key={bus.id} bus={bus} />
      ))}
    </>
  );
}
