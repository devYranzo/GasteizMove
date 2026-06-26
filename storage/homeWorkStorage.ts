import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "home_work_locations_v1";

export type HomeWorkLocation = {
  lat: number;
  lng: number;
  name: string; // dirección legible (calle, número…)
};

export type HomeWorkStore = {
  home?: HomeWorkLocation;
  work?: HomeWorkLocation;
};

type Listener = (store: HomeWorkStore) => void;

let cache: HomeWorkStore | null = null;
const listeners = new Set<Listener>();

function notify(store: HomeWorkStore) {
  listeners.forEach((l) => l(store));
}

async function getStore(): Promise<HomeWorkStore> {
  if (cache !== null) return cache;
  const data = await AsyncStorage.getItem(KEY);
  cache = data ? JSON.parse(data) : {};
  return cache!;
}

async function persist(store: HomeWorkStore): Promise<void> {
  cache = store;
  await AsyncStorage.setItem(KEY, JSON.stringify(store));
  notify(store);
}

export function subscribeHomeWork(listener: Listener): () => void {
  listeners.add(listener);
  if (cache !== null) listener(cache);
  return () => listeners.delete(listener);
}

export async function loadHomeWork(): Promise<HomeWorkStore> {
  return getStore();
}

export async function setHomeWorkLocation(
  key: "home" | "work",
  location: HomeWorkLocation | undefined
): Promise<void> {
  const current = await getStore();
  const next = { ...current };
  if (location === undefined) {
    delete next[key];
  } else {
    next[key] = location;
  }
  await persist(next);
}
