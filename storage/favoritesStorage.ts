import { Favorite } from "@/types/favorite";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "favorites_v1";

type Listener = (favorites: Favorite[]) => void;

// Estado compartido en memoria
let cache: Favorite[] | null = null;
const listeners = new Set<Listener>();

function notify(favorites: Favorite[]) {
  listeners.forEach((l) => l(favorites));
}

async function getAll(): Promise<Favorite[]> {
  if (cache !== null) return cache;
  const data = await AsyncStorage.getItem(KEY);
  cache = data ? JSON.parse(data) : [];
  return cache!;
}

async function persist(favorites: Favorite[]) {
  cache = favorites;
  await AsyncStorage.setItem(KEY, JSON.stringify(favorites));
  notify(favorites);
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  // Entregar estado actual inmediatamente si ya está cargado
  if (cache !== null) listener(cache);
  return () => listeners.delete(listener);
}

export async function loadFavorites(): Promise<Favorite[]> {
  return getAll();
}

export async function addFavorite(fav: Favorite): Promise<void> {
  const current = await getAll();
  // Evitar duplicados
  if (current.some((f) => f.type === fav.type && f.refId === fav.refId)) return;
  await persist([...current, fav]);
}

export async function removeFavorite(type: string, refId: string): Promise<void> {
  const current = await getAll();
  await persist(current.filter((f) => !(f.type === type && f.refId === refId)));
}
