export type LostFoundType = "lost" | "found";
export type LostFoundStatus = "open" | "matched" | "closed";

export interface LostFoundItem {
  id: string;
  reporter_id: string;
  type: LostFoundType;
  description: string;
  image_url: string | null;
  status: LostFoundStatus;
  created_at: string;
}
