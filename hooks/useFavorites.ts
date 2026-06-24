import {
  loadFavorites,
  addFavorite as storeAdd,
  removeFavorite as storeRemove,
  subscribe,
} from "@/storage/favoritesStorage";
import { Favorite } from "@/types/favorite";
import { useEffect, useState } from "react";

export function useFavorites() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  useEffect(() => {
    // Carga inicial + suscripción a cambios
    loadFavorites().then(setFavorites);
    const unsubscribe = subscribe(setFavorites);
    return unsubscribe;
  }, []);

  const addFavorite = async (fav: Favorite) => {
    await storeAdd(fav);
  };

  const removeFavorite = async (type: string, refId: string) => {
    await storeRemove(type, refId);
  };

  return { favorites, addFavorite, removeFavorite };
}
