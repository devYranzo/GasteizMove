import { useEffect, useState } from "react";
import {
  HomeWorkStore,
  HomeWorkLocation,
  loadHomeWork,
  setHomeWorkLocation,
  subscribeHomeWork,
} from "@/storage/homeWorkStorage";

export function useHomeWork() {
  const [store, setStore] = useState<HomeWorkStore>({});

  useEffect(() => {
    loadHomeWork().then(setStore);
    const unsubscribe = subscribeHomeWork(setStore);
    return unsubscribe;
  }, []);

  const setLocation = async (key: "home" | "work", location: HomeWorkLocation | undefined) => {
    await setHomeWorkLocation(key, location);
  };

  return {
    home: store.home,
    work: store.work,
    setLocation,
  };
}
