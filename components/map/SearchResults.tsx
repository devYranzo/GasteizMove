import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FlatList, Pressable, Text, View } from "react-native";

type StopRoute = {
  id: string;
  name: string;
  color?: string;
};

export type SearchResult = {
  id: string;
  name: string;
  type: "stop" | "street";
  latitude?: number;
  longitude?: number;
  routes?: StopRoute[]; // 👈 añadido
};

interface Props {
  visible: boolean;
  results: SearchResult[];
  onPress: (result: SearchResult) => void;
}

export function SearchResults({ visible, results, onPress }: Props) {
  if (!visible || results.length === 0) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: 136,
        left: 16,
        right: 16,
        backgroundColor: "white",
        borderRadius: 16,
        zIndex: 999,
        elevation: 999,
        maxHeight: 300,
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 8,
      }}
    >
      <FlatList
        keyboardShouldPersistTaps="handled"
        data={results}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onPress(item)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: "#f3f4f6",
            }}
          >
            <View style={{ gap: 6 }}>
              {/* fila principal */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                {/* nombre + icono */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    flex: 1,
                  }}
                >
                  {item.type === "stop" ? (
                    <MaterialCommunityIcons name="bus-stop" size={16} color="#3e5d58" />
                  ) : (
                    <MaterialCommunityIcons name="map-marker-outline" size={16} color="#6b7280" />
                  )}

                  <Text
                    style={{
                      fontSize: 16,
                      flexShrink: 1,
                    }}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                </View>

                {/* líneas a la derecha */}
                {item.type === "stop" && item.routes && (
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      justifyContent: "flex-end",
                      gap: 6,
                      maxWidth: "50%",
                    }}
                  >
                    {item.routes.slice(0, 6).map((route) => (
                      <View
                        key={route.id}
                        style={{
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 8,
                          backgroundColor: route.color ?? "#9ca3af",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            color: "white",
                            fontWeight: "600",
                          }}
                        >
                          {route.name}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
