import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FlatList, Pressable, Text, View } from "react-native";

export type SearchResult = {
  id: string;
  name: string;
  type: "stop" | "street";
  latitude?: number;
  longitude?: number;
};

interface Props {
  visible: boolean;
  results: SearchResult[];
  onPress: (result: SearchResult) => void;
}

export function SearchResults({ visible, results, onPress }: Props) {
  if (!visible || results.length === 0) {
    return null;
  }

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
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              {item.type === "stop" ? (
                <MaterialCommunityIcons name="bus-stop" size={16} color="#3e5d58" />
              ) : (
                <MaterialCommunityIcons name="map-marker-outline" size={16} color="#6b7280" />
              )}

              <Text style={{ fontSize: 16 }}>{item.name}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
