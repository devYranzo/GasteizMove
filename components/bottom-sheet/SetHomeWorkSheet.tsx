/**
 * SetHomeWorkSheet
 */

import { HomeWorkLocation } from "@/storage/homeWorkStorage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ── Tipos ────────────────────────────────────────────────────────────────────

type Props = {
  visible: boolean;
  locationKey: "home" | "work";
  current?: HomeWorkLocation;
  onSave: (location: HomeWorkLocation) => void;
  onDelete: () => void;
  onClose: () => void;
  streets: { nameEs: string; nameEu: string; latitude: number; longitude: number }[];
};

// ── Configuración visual por tipo ────────────────────────────────────────────

const CONFIG = {
  home: {
    icon: "home",
    label: "Casa",
    color: "#2563eb",
    bg: "#eff6ff",
    placeholder: "Busca tu dirección de casa…",
  },
  work: {
    icon: "briefcase",
    label: "Trabajo",
    color: "#0891b2",
    bg: "#ecfeff",
    placeholder: "Busca tu dirección de trabajo…",
  },
} as const;

// ── Componente ────────────────────────────────────────────────────────────────

export function SetHomeWorkSheet({
  visible,
  locationKey,
  current,
  onSave,
  onDelete,
  onClose,
  streets,
}: Props) {
  const config = CONFIG[locationKey];
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<typeof streets>([]);
  const [selected, setSelected] = useState<HomeWorkLocation | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputRef = useRef<TextInput>(null);

  // Ref para controlar si el teclado se está cerrando y evitar falsos clics en el fondo
  const isKeyboardHiding = useRef(false);

  useEffect(() => {
    // Usamos 'willShow' y 'willHide' para que la transición sea síncrona con la animación del teclado
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, (e) => {
      isKeyboardHiding.current = false;
      setKeyboardHeight(e.endCoordinates.height);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      isKeyboardHiding.current = true;
      setKeyboardHeight(0);
      // Pequeño timeout para restablecer el flag después de que termine de bajar
      setTimeout(() => {
        isKeyboardHiding.current = false;
      }, 300);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Prellenar si ya existe una ubicación guardada
  useEffect(() => {
    if (visible) {
      if (current) {
        setQuery(current.name);
        setSelected(current);
      } else {
        setQuery("");
        setSelected(null);
      }
      setSuggestions([]);
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [visible, current]);

  // Autocompletar
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q || selected) {
      setSuggestions([]);
      return;
    }
    setSuggestions(
      streets
        .filter((s) => s.nameEs.toLowerCase().includes(q) || s.nameEu.toLowerCase().includes(q))
        .slice(0, 8)
    );
  }, [query, selected]);

  function handleSelectStreet(street: (typeof streets)[0]) {
    const loc: HomeWorkLocation = {
      lat: street.latitude,
      lng: street.longitude,
      name: street.nameEs,
    };
    setSelected(loc);
    setQuery(street.nameEs);
    setSuggestions([]);
    Keyboard.dismiss();
  }

  function handleSave() {
    if (!selected) return;
    onSave(selected);
    onClose();
  }

  function handleDelete() {
    Alert.alert(
      `Quitar ${config.label}`,
      `¿Seguro que quieres eliminar tu dirección de ${config.label.toLowerCase()}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            onDelete();
            onClose();
          },
        },
      ]
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "flex-end",
          backgroundColor: "rgba(0,0,0,0.35)",
        }}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <Pressable
          style={{ flex: 1, justifyContent: "flex-end" }}
          onPress={() => {
            // Si el teclado se está ocultando en este milisegundo, ignoramos el toque exterior
            // para evitar que un salto de interfaz cierre el modal por error.
            if (isKeyboardHiding.current) return;

            Keyboard.dismiss();
            onClose();
          }}
        >
          {/* Evita que el tap dentro del sheet lo cierre */}
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View
              style={{
                backgroundColor: "white",
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                paddingTop: 12,
                // Restamos un poco de padding cuando el teclado está activo para que no suba excesivamente en pantallas pequeñas
                paddingBottom: keyboardHeight > 0 ? keyboardHeight - 10 : 40,
              }}
            >
              {/* Handle */}
              <View
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: "#d1d5db",
                  alignSelf: "center",
                  marginBottom: 16,
                }}
              />

              {/* Cabecera */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 20,
                  marginBottom: 20,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: config.bg,
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 12,
                  }}
                >
                  <MaterialCommunityIcons
                    name={config.icon as any}
                    size={22}
                    color={config.color}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: "700", color: "#111827" }}>
                    {current ? `Editar ${config.label}` : `Añadir ${config.label}`}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 1 }}>
                    {current
                      ? "Cambia la dirección o elimínala"
                      : "Establece tu dirección de acceso rápido"}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} hitSlop={12}>
                  <MaterialCommunityIcons name="close" size={22} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              {/* Buscador */}
              <View style={{ paddingHorizontal: 20 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#f3f3f6",
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    marginBottom: 4,
                  }}
                >
                  <MaterialCommunityIcons name="magnify" size={20} color="#9ca3af" />
                  <TextInput
                    ref={inputRef}
                    value={query}
                    onChangeText={(t) => {
                      setQuery(t);
                      setSelected(null);
                    }}
                    placeholder={config.placeholder}
                    placeholderTextColor="#9ca3af"
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      paddingHorizontal: 8,
                      fontSize: 15,
                      color: "#111827",
                    }}
                    returnKeyType="search"
                  />
                  {query.length > 0 && (
                    <TouchableOpacity
                      onPress={() => {
                        setQuery("");
                        setSelected(null);
                        inputRef.current?.focus();
                      }}
                    >
                      <MaterialCommunityIcons name="close-circle" size={18} color="#9ca3af" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Sugerencias */}
              {suggestions.length > 0 && (
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  style={{ maxHeight: 150, marginHorizontal: 20, marginTop: 4 }}
                >
                  {suggestions.map((s, i) => (
                    <TouchableOpacity
                      key={`${s.latitude}-${s.longitude}-${i}`}
                      onPress={() => handleSelectStreet(s)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 10,
                        borderBottomWidth: i < suggestions.length - 1 ? 1 : 0,
                        borderBottomColor: "#f1f5f9",
                      }}
                    >
                      <MaterialCommunityIcons
                        name="map-marker-outline"
                        size={16}
                        color="#9ca3af"
                        style={{ marginRight: 8 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, color: "#111827" }}>{s.nameEs}</Text>
                        {s.nameEu !== s.nameEs && (
                          <Text style={{ fontSize: 11, color: "#9ca3af" }}>{s.nameEu}</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {/* Ubicación seleccionada (preview) */}
              {selected && (
                <View
                  style={{
                    marginHorizontal: 20,
                    marginTop: 12,
                    backgroundColor: config.bg,
                    borderRadius: 10,
                    padding: 12,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <MaterialCommunityIcons
                    name="map-marker-check"
                    size={18}
                    color={config.color}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={{ fontSize: 13, color: config.color, flex: 1, fontWeight: "500" }}>
                    {selected.name}
                  </Text>
                </View>
              )}

              {/* Acciones */}
              <View
                style={{
                  flexDirection: "row",
                  paddingHorizontal: 20,
                  marginTop: 20,
                  gap: 10,
                }}
              >
                {current && (
                  <TouchableOpacity
                    onPress={handleDelete}
                    style={{
                      flex: 1,
                      paddingVertical: 13,
                      borderRadius: 12,
                      backgroundColor: "#fef2f2",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: "600", color: "#ef4444" }}>
                      Eliminar
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={!selected}
                  style={{
                    flex: 2,
                    paddingVertical: 13,
                    borderRadius: 12,
                    backgroundColor: selected ? config.color : "#e5e7eb",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "700",
                      color: selected ? "white" : "#9ca3af",
                    }}
                  >
                    Guardar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </ScrollView>
    </Modal>
  );
}
