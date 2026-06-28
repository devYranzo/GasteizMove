import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable } from "react-native";
import { useFavorites } from "../hooks/useFavorites";

export function FavoriteButton({
  id,
  title,
  type,
}: {
  id: string;
  title: string;
  type: "stop" | "line" | "route";
}) {
  const { favorites, addFavorite, removeFavorite } = useFavorites();

  const isFav = favorites.some((f) => f.type === type && f.refId === id);

  async function toggle() {
    if (isFav) {
      await removeFavorite(type, id);
    } else {
      await addFavorite({
        id: `${type}-${id}`,
        type,
        title,
        refId: id,
        createdAt: Date.now(),
      });
    }
  }

  return (
    <Pressable
      onPress={toggle}
      style={{
        width: 40,
        height: 40,
        marginRight: 8,
        borderRadius: 20,
        backgroundColor: isFav ? "#fefce8" : "#f9fafb",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: isFav ? "#fde68a" : "#e5e7eb",
      }}
    >
      {isFav ? (
        <MaterialCommunityIcons name="star" size={24} color="#facc15" />
      ) : (
        <MaterialCommunityIcons name="star-outline" size={24} color="#6b7280" />
      )}
    </Pressable>
  );
}
