import { FontAwesome } from "@expo/vector-icons";
import { TextInput, View } from "react-native";

interface Props {
  value: string;
  onChangeText: (text: string) => void;
}

export function SearchBar({ value, onChangeText }: Props) {
  return (
    <View
      style={{
        position: "absolute",
        top: 70,
        left: 16,
        right: 16,

        zIndex: 999,
        elevation: 999,

        flexDirection: "row",
        alignItems: "center",

        backgroundColor: "white",

        borderRadius: 28,

        paddingHorizontal: 16,
        height: 58,

        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 8,
      }}
    >
      <FontAwesome name="search" size={18} color="#6b7280" style={{ marginRight: 10 }} />

      <TextInput
        placeholder="Buscar parada..."
        placeholderTextColor="#9ca3af"
        style={{
          flex: 1,
          fontSize: 16,
        }}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}
