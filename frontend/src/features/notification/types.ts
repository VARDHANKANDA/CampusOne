export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface NotificationSetting {
  id: string;
  event_type: string;
  email_enabled: boolean;
  updated_by: string | null;
  updated_at: string;
}
