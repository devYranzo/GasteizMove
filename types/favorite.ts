export type FavoriteType = "stop" | "line" | "route";

export type Favorite = {
  id: string;
  type: FavoriteType;
  title: string;
  refId?: string;
  createdAt: number;
  metadata?: {
    originLat: number;
    originLng: number;
    destLat: number;
    destLng: number;
    destName: string;
  };
};
