export type FavoriteType = "stop" | "line" | "route";

export type Favorite = {
  id: string;
  type: FavoriteType;
  title: string;
  refId?: string;
  createdAt: number;
};
