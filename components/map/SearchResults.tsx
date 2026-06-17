import { FlatList, Pressable, Text, View } from "react-native";

interface Result {
  id: string;
  name: string;
}

interface Props {
  visible: boolean;
  results: Result[];
  onPress: (result: Result) => void;
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
        keyExtractor={(item) => item.id}
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
            <Text
              style={{
                fontSize: 16,
              }}
            >
              {item.name}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}
