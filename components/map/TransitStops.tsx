import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getTransitModeColor } from "@/services/transit/transitModes";
import { TransitMode, TransitStop } from "@/types/transit";
import { View } from "react-native";
import { Marker } from "react-native-maps";

export type Stop = TransitStop;

interface Props {
  stops: Stop[];
  visibleStopIds: Set<string>;
  selectedStopId: string | null;
  onStopPress?: (stop: Stop) => void;
}

function getStopMode(stop: Stop): TransitMode {
  return stop.modes?.[0] ?? "bus";
}

function getStopIcon(mode: TransitMode) {
  if (mode === "tram") return "train";
  return "bus-stop";
}

export function TransitStops({
  stops,
  visibleStopIds,
  selectedStopId,
  onStopPress,
}: Props) {
  return (
    <>
      {stops.map((stop) => {
        const isSelected = stop.id === selectedStopId;
        const isVisible = visibleStopIds.has(stop.id);
        const mode = getStopMode(stop);
        const color = getTransitModeColor(mode);

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
                backgroundColor: isSelected ? color : "white",
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 1,
                borderColor: isSelected ? color : "#d1d5db",
              }}
            >
              <MaterialCommunityIcons
                name={getStopIcon(mode)}
                size={16}
                color={isSelected ? "white" : color}
              />
            </View>
          </Marker>
        );
      })}
    </>
  );
}
