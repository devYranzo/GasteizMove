import { useFavorites } from "@/hooks/useFavorites";
import { Favorite } from "@/types/favorite";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, FlatList, Text, TouchableOpacity, View } from "react-native";

const TYPE_CONFIG: Record<
  Favorite["type"],
  { icon: string; label: string; color: string; bg: string }
> = {
  stop: {
    icon: "bus-stop",
    label: "Parada",
    color: "#2563eb",
    bg: "#eff6ff",
  },
  line: {
    icon: "bus",
    label: "Línea",
    color: "#16a34a",
    bg: "#f0fdf4",
  },
  route: {
    icon: "map-marker-path",
    label: "Ruta",
    color: "#9333ea",
    bg: "#faf5ff",
  },
};

export default function FavoritesScreen() {
  const { favorites, removeFavorite } = useFavorites();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handlePress = (fav: Favorite) => {
    if (fav.type === "stop") {
      router.push({ pathname: "/", params: { stopId: fav.refId } });
    }
  };

  const handleDelete = (fav: Favorite) => {
    Alert.alert("Quitar favorito", `¿Quitar "${fav.title}" de favoritos?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Quitar",
        style: "destructive",
        onPress: async () => {
          setDeletingId(fav.id);
          await removeFavorite(fav.type, fav.refId);
          setDeletingId(null);
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Favorite }) => {
    const config = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.stop;
    const isDeleting = deletingId === item.id;
    const isNavigable = item.type === "stop";

    return (
      <TouchableOpacity
        onPress={() => handlePress(item)}
        disabled={!isNavigable || isDeleting}
        activeOpacity={isNavigable ? 0.7 : 1}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "white",
          borderRadius: 14,
          marginBottom: 10,
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderWidth: 1,
          borderColor: "#f1f5f9",
          opacity: isDeleting ? 0.4 : 1,
          elevation: 1,
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 1 },
        }}
      >
        {/* Icono tipo */}
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            backgroundColor: config.bg,
            justifyContent: "center",
            alignItems: "center",
            marginRight: 14,
          }}
        >
          <MaterialCommunityIcons name={config.icon as any} size={22} color={config.color} />
        </View>

        {/* Texto */}
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: "600", color: "#111827" }}>
            {item.title}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2, gap: 4 }}>
            <Text style={{ fontSize: 12, color: "#9ca3af" }}>{config.label}</Text>
            {isNavigable && (
              <>
                <Text style={{ fontSize: 12, color: "#d1d5db" }}>·</Text>
                <Text style={{ fontSize: 12, color: "#2563eb" }}>Ir a la parada</Text>
              </>
            )}
          </View>
        </View>

        {/* Estrella + borrar */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <MaterialCommunityIcons name="star" size={18} color="#facc15" />
          <TouchableOpacity
            onPress={() => handleDelete(item)}
            disabled={isDeleting}
            style={{
              marginLeft: 8,
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: "#fef2f2",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      {/* Header */}
      <View
        style={{
          paddingTop: 60,
          paddingBottom: 20,
          paddingHorizontal: 20,
          backgroundColor: "white",
          borderBottomWidth: 1,
          borderBottomColor: "#f1f5f9",
        }}
      >
        <Text style={{ fontSize: 26, fontWeight: "700", color: "#111827" }}>Favoritos</Text>
        {favorites.length > 0 && (
          <Text style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>
            {favorites.length}{" "}
            {favorites.length === 1 ? "elemento guardado" : "elementos guardados"}
          </Text>
        )}
      </View>

      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 80 }}>
            <MaterialCommunityIcons name="star-outline" size={56} color="#d1d5db" />
            <Text style={{ fontSize: 17, fontWeight: "600", color: "#9ca3af", marginTop: 16 }}>
              Sin favoritos aún
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#d1d5db",
                marginTop: 6,
                textAlign: "center",
                paddingHorizontal: 40,
              }}
            >
              Guarda paradas, líneas o rutas para acceder rápido desde aquí
            </Text>
          </View>
        }
      />
    </View>
  );
}
