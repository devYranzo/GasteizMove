import { FontAwesome, MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
// Importamos el tipo para que coincida con tu sistema de datos
import type { HomeWorkLocation } from "@/storage/homeWorkStorage";

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  homeLocation?: HomeWorkLocation; // <-- Pasamos el objeto de casa guardado
  workLocation?: HomeWorkLocation; // <-- Pasamos el objeto de trabajo guardado
  onPressLocation: (location: HomeWorkLocation) => void; // <-- Acción unificada para llevarte allí
}

export function SearchBar({
  value,
  onChangeText,
  homeLocation,
  workLocation,
  onPressLocation,
}: Props) {
  // Comprobamos si existen para renderizar las cápsulas de forma condicional
  const hasHome = !!homeLocation;
  const hasWork = !!workLocation;

  return (
    <View
      style={{
        position: "absolute",
        top: 70,
        left: 16,
        right: 16,
        zIndex: 999,
        elevation: 999,
      }}
    >
      {/* Input de Búsqueda */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "white",
          borderRadius: 28,
          paddingHorizontal: 16,
          height: 58,
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 5,
        }}
      >
        <FontAwesome name="search" size={18} color="#6b7280" style={{ marginRight: 10 }} />

        <TextInput
          placeholder="Buscar parada..."
          placeholderTextColor="#9ca3af"
          style={{
            flex: 1,
            fontSize: 16,
            color: "#111827",
          }}
          value={value}
          onChangeText={onChangeText}
        />
      </View>

      {/* Fila de Accesos Rápidos (Solo si al menos uno está configurado) */}
      {(hasHome || hasWork) && (
        <View
          style={{
            flexDirection: "row",
            marginTop: 10,
            gap: 8,
          }}
        >
          {/* Cápsula Casa */}
          {hasHome && (
            <TouchableOpacity
              onPress={() => onPressLocation(homeLocation)}
              activeOpacity={0.8}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "white",
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 20,
                shadowColor: "#000",
                shadowOpacity: 0.1,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
                elevation: 3,
              }}
            >
              <MaterialCommunityIcons
                name="home"
                size={16}
                color="#2563eb"
                style={{ marginRight: 6 }}
              />
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151" }}>Casa</Text>
            </TouchableOpacity>
          )}

          {/* Cápsula Trabajo */}
          {hasWork && (
            <TouchableOpacity
              onPress={() => onPressLocation(workLocation)}
              activeOpacity={0.8}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "white",
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 20,
                shadowColor: "#000",
                shadowOpacity: 0.1,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
                elevation: 3,
              }}
            >
              <MaterialCommunityIcons
                name="briefcase"
                size={16}
                color="#0891b2"
                style={{ marginRight: 6 }}
              />
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151" }}>Trabajo</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}
