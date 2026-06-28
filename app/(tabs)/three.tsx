import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type AlertPeriod = {
  start: number | null;
  end: number | null;
};

type InformedEntity = {
  routeId: string | null;
  stopId: string | null;
  tripId: string | null;
};

type Alert = {
  id: string;
  headerText: string | null;
  descriptionText: string | null;
  cause: number | null;
  effect: number | null;
  activePeriod: AlertPeriod[];
  informedEntities: InformedEntity[];
};

// ─── Configuración ────────────────────────────────────────────────────────────

const API_BASE = __DEV__ ? "http://192.168.50.10:3000" : "https://tu-servidor.com";

// GTFS-RT cause codes → texto legible
const CAUSE_LABELS: Record<number, string> = {
  1: "Causa desconocida",
  2: "Otra causa",
  3: "Problema técnico",
  4: "Huelga",
  5: "Manifestación",
  6: "Accidente",
  7: "Obras",
  8: "Condiciones meteorológicas",
  9: "Festivo",
  10: "Fraude",
  11: "Problema policial",
};

// GTFS-RT effect codes → texto e icono
const EFFECT_CONFIG: Record<number, { label: string; color: string; bg: string; icon: string }> = {
  1: { label: "Sin servicio", color: "#dc2626", bg: "#fef2f2", icon: "bus-alert" },
  2: { label: "Servicio reducido", color: "#d97706", bg: "#fffbeb", icon: "bus-clock" },
  3: { label: "Retrasos", color: "#d97706", bg: "#fffbeb", icon: "clock-alert" },
  4: { label: "Desvío", color: "#2563eb", bg: "#eff6ff", icon: "map-marker-path" },
  5: { label: "Parada adicional", color: "#16a34a", bg: "#f0fdf4", icon: "map-marker-plus" },
  6: { label: "Parada eliminada", color: "#dc2626", bg: "#fef2f2", icon: "map-marker-remove" },
  7: {
    label: "Sin accesibilidad",
    color: "#7c3aed",
    bg: "#f5f3ff",
    icon: "wheelchair-accessibility",
  },
  8: { label: "Información", color: "#0891b2", bg: "#ecfeff", icon: "information" },
};

const DEFAULT_EFFECT = { label: "Aviso", color: "#6b7280", bg: "#f9fafb", icon: "alert-circle" };

function formatPeriod(start: number | null, end: number | null): string {
  const fmt = (ts: number) =>
    new Date(ts * 1000).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `Desde ${fmt(start)}`;
  if (end) return `Hasta ${fmt(end)}`;
  return "Período no especificado";
}

// ─── Componente de alerta ─────────────────────────────────────────────────────

function AlertCard({
  alert,
  expanded,
  onToggle,
}: {
  alert: Alert;
  expanded: boolean;
  onToggle: () => void;
}) {
  const effectCfg =
    alert.effect != null ? (EFFECT_CONFIG[alert.effect] ?? DEFAULT_EFFECT) : DEFAULT_EFFECT;
  const cause = alert.cause != null ? CAUSE_LABELS[alert.cause] : null;

  const routes = [...new Set(alert.informedEntities.map((e) => e.routeId).filter(Boolean))];
  const stops = [...new Set(alert.informedEntities.map((e) => e.stopId).filter(Boolean))];

  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.85}
      style={{
        backgroundColor: "white",
        borderRadius: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#f1f5f9",
        overflow: "hidden",
        elevation: 1,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
      }}
    >
      {/* Franja de color según efecto */}
      <View style={{ height: 4, backgroundColor: effectCfg.color }} />

      <View style={{ padding: 14 }}>
        {/* Cabecera */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: effectCfg.bg,
              justifyContent: "center",
              alignItems: "center",
              marginTop: 1,
            }}
          >
            <MaterialCommunityIcons
              name={effectCfg.icon as any}
              size={20}
              color={effectCfg.color}
            />
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <View
                style={{
                  backgroundColor: effectCfg.bg,
                  borderRadius: 6,
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "700", color: effectCfg.color }}>
                  {effectCfg.label}
                </Text>
              </View>
              {cause && <Text style={{ fontSize: 11, color: "#9ca3af" }}>{cause}</Text>}
            </View>

            <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827", lineHeight: 20 }}>
              {alert.headerText ?? "Sin título"}
            </Text>
          </View>

          <MaterialCommunityIcons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="#9ca3af"
          />
        </View>

        {/* Expandido */}
        {expanded && (
          <View style={{ marginTop: 12 }}>
            {/* Descripción */}
            {alert.descriptionText && (
              <Text style={{ fontSize: 13, color: "#374151", lineHeight: 18, marginBottom: 12 }}>
                {alert.descriptionText}
              </Text>
            )}

            {/* Período activo */}
            {alert.activePeriod.length > 0 && (
              <View style={{ marginBottom: 10 }}>
                {alert.activePeriod.map((p, i) => (
                  <View
                    key={i}
                    style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}
                  >
                    <MaterialCommunityIcons name="clock-outline" size={13} color="#9ca3af" />
                    <Text style={{ fontSize: 12, color: "#6b7280" }}>
                      {formatPeriod(p.start, p.end)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Líneas afectadas */}
            {routes.length > 0 && (
              <View
                style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 }}
              >
                <Text style={{ fontSize: 12, color: "#9ca3af" }}>Líneas:</Text>
                {routes.map((r) => (
                  <View
                    key={r}
                    style={{
                      backgroundColor: "#2563eb",
                      borderRadius: 6,
                      paddingHorizontal: 7,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={{ color: "white", fontWeight: "700", fontSize: 12 }}>{r}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Paradas afectadas */}
            {stops.length > 0 && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 6,
                  marginTop: 6,
                }}
              >
                <Text style={{ fontSize: 12, color: "#9ca3af" }}>Paradas:</Text>
                {stops.map((s) => (
                  <View
                    key={s}
                    style={{
                      backgroundColor: "#f3f4f6",
                      borderRadius: 6,
                      paddingHorizontal: 7,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={{ color: "#374151", fontWeight: "600", fontSize: 12 }}>{s}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function loadAlerts(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/alerts`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAlerts(data.alerts ?? []);
    } catch (e: any) {
      setError("No se pudieron cargar las alertas");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAlerts();
    // Refresca cada 60 segundos
    const interval = setInterval(() => loadAlerts(), 60_000);
    return () => clearInterval(interval);
  }, []);

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
        <Text style={{ fontSize: 26, fontWeight: "700", color: "#111827" }}>Alertas</Text>
        {!loading && !error && (
          <Text style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>
            {alerts.length === 0
              ? "Sin incidencias activas"
              : `${alerts.length} ${alerts.length === 1 ? "incidencia activa" : "incidencias activas"}`}
          </Text>
        )}
      </View>

      {/* Contenido */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={{ color: "#9ca3af", fontSize: 14, marginTop: 12 }}>Cargando alertas…</Text>
        </View>
      ) : error ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 }}
        >
          <MaterialCommunityIcons name="wifi-off" size={48} color="#d1d5db" />
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#9ca3af", marginTop: 16 }}>
            {error}
          </Text>
          <TouchableOpacity
            onPress={() => loadAlerts()}
            style={{
              marginTop: 16,
              backgroundColor: "#2563eb",
              borderRadius: 10,
              paddingHorizontal: 20,
              paddingVertical: 10,
            }}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : alerts.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 80 }}>
          <MaterialCommunityIcons name="check-circle-outline" size={56} color="#d1d5db" />
          <Text style={{ fontSize: 17, fontWeight: "600", color: "#9ca3af", marginTop: 16 }}>
            Todo en orden
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
            No hay incidencias ni alertas activas en este momento
          </Text>
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadAlerts(true)}
              colors={["#2563eb"]}
            />
          }
          renderItem={({ item }) => (
            <AlertCard
              alert={item}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
            />
          )}
        />
      )}
    </View>
  );
}
