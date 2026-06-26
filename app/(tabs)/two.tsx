import { SetHomeWorkSheet } from "@/components/bottom-sheet/SetHomeWorkSheet";
import streets from "@/data/streets.json";
import { useFavorites } from "@/hooks/useFavorites";
import { useHomeWork } from "@/hooks/useHomeWork";
import { HomeWorkLocation } from "@/storage/homeWorkStorage";
import { Favorite } from "@/types/favorite";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, FlatList, Text, TouchableOpacity, View } from "react-native";

// ── Config de tipos de favoritos ─────────────────────────────────────────────

const TYPE_CONFIG: Record<
  Favorite["type"],
  { icon: string; label: string; color: string; bg: string }
> = {
  stop: { icon: "bus-stop", label: "Parada", color: "#2563eb", bg: "#eff6ff" },
  line: { icon: "bus", label: "Línea", color: "#16a34a", bg: "#f0fdf4" },
  route: { icon: "map-marker-path", label: "Ruta", color: "#9333ea", bg: "#faf5ff" },
};

const HW_CONFIG = {
  home: { icon: "home", label: "Casa", color: "#2563eb", bg: "#eff6ff" },
  work: { icon: "briefcase", label: "Trabajo", color: "#0891b2", bg: "#ecfeff" },
} as const;

// ── Pantalla principal ───────────────────────────────────────────────────────

export default function FavoritesScreen() {
  const { favorites, removeFavorite } = useFavorites();
  const { home, work, setLocation } = useHomeWork();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Control del sheet de edición casa/trabajo
  const [sheetKey, setSheetKey] = useState<"home" | "work" | null>(null);

  // ── Navegación desde favoritos ──────────────────────────────────────────

  const handlePress = (fav: Favorite) => {
    if (fav.type === "stop") {
      router.push({ pathname: "/", params: { stopId: fav.refId } });
    }
    if (fav.type === "route" && fav.metadata) {
      router.push({
        pathname: "/",
        params: {
          routeDestLat: String(fav.metadata.destLat),
          routeDestLng: String(fav.metadata.destLng),
          routeDestName: fav.metadata.destName,
        },
      });
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

  // ── Navegar a casa/trabajo ──────────────────────────────────────────────

  function handleGoTo(loc: HomeWorkLocation, key: "home" | "work") {
    router.push({
      pathname: "/",
      params: {
        routeDestLat: String(loc.lat),
        routeDestLng: String(loc.lng),
        routeDestName: loc.name,
      },
    });
  }

  // ── Tarjeta Casa / Trabajo ──────────────────────────────────────────────

  function HomeWorkCard({ hwKey }: { hwKey: "home" | "work" }) {
    const config = HW_CONFIG[hwKey];
    const loc = hwKey === "home" ? home : work;

    return (
      <TouchableOpacity
        onPress={() => (loc ? handleGoTo(loc, hwKey) : setSheetKey(hwKey))}
        activeOpacity={0.7}
        style={{
          flex: 1,
          backgroundColor: "white",
          borderRadius: 14,
          padding: 14,
          borderWidth: 1,
          borderColor: loc ? config.bg : "#f1f5f9",
          elevation: 1,
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 1 },
        }}
      >
        {/* Icono + botón editar */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: config.bg,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <MaterialCommunityIcons name={config.icon as any} size={20} color={config.color} />
          </View>
          <TouchableOpacity
            hitSlop={10}
            onPress={() => setSheetKey(hwKey)}
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: "#f3f4f6",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <MaterialCommunityIcons
              name={loc ? "pencil-outline" : "plus"}
              size={15}
              color="#6b7280"
            />
          </TouchableOpacity>
        </View>

        {/* Nombre del tipo */}
        <Text style={{ fontSize: 13, fontWeight: "700", color: "#111827" }}>{config.label}</Text>

        {/* Dirección o placeholder */}
        {loc ? (
          <>
            <Text numberOfLines={2} style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
              {loc.name}
            </Text>
            <Text style={{ fontSize: 11, color: config.color, marginTop: 6, fontWeight: "600" }}>
              Ir ahora →
            </Text>
          </>
        ) : (
          <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Toca para añadir</Text>
        )}
      </TouchableOpacity>
    );
  }

  // ── Item de favorito (sin cambios) ──────────────────────────────────────

  const renderItem = ({ item }: { item: Favorite }) => {
    const config = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.stop;
    const isDeleting = deletingId === item.id;
    const isNavigable = item.type === "stop" || (item.type === "route" && !!item.metadata);

    const subtitle = item.type === "route" && item.metadata ? item.metadata.destName : config.label;
    const routeLines =
      item.type === "route" ? item.refId.split("-").filter((r) => r && r !== "walk") : [];

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

        <View style={{ flex: 1 }}>
          {routeLines.length > 0 ? (
            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
              {routeLines.map((lineId) => (
                <View
                  key={lineId}
                  style={{
                    backgroundColor: "#2563eb",
                    borderRadius: 6,
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "700", fontSize: 12 }}>{lineId}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: "600", color: "#111827" }}>
              {item.title}
            </Text>
          )}

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              marginTop: routeLines.length > 0 ? 0 : 2,
            }}
          >
            {item.type === "route" && (
              <MaterialCommunityIcons name="map-marker" size={12} color="#9ca3af" />
            )}
            <Text numberOfLines={1} style={{ fontSize: 12, color: "#9ca3af", flex: 1 }}>
              {subtitle}
            </Text>
          </View>

          {isNavigable && (
            <Text style={{ fontSize: 11, color: config.color, marginTop: 3 }}>
              {item.type === "route" ? "Recalcular ruta" : "Ver en mapa"}
            </Text>
          )}
        </View>

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

  // ── Render ──────────────────────────────────────────────────────────────

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
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
        ListHeaderComponent={
          <>
            {/* ── Sección Casa / Trabajo ── */}
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: "#9ca3af",
                letterSpacing: 0.5,
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              Acceso rápido
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
              <HomeWorkCard hwKey="home" />
              <HomeWorkCard hwKey="work" />
            </View>

            {/* ── Separador favoritos ── */}
            {favorites.length > 0 && (
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: "#9ca3af",
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                Guardados
              </Text>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 40 }}>
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

      {/* Sheet de edición Casa / Trabajo */}
      <SetHomeWorkSheet
        visible={sheetKey !== null}
        locationKey={sheetKey ?? "home"}
        current={sheetKey === "home" ? home : sheetKey === "work" ? work : undefined}
        streets={streets}
        onSave={(loc) => sheetKey && setLocation(sheetKey, loc)}
        onDelete={() => sheetKey && setLocation(sheetKey, undefined)}
        onClose={() => setSheetKey(null)}
      />
    </View>
  );
}
