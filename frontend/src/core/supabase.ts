import { createClient } from "@supabase/supabase-js";

/** Browser Supabase client — anon key only. Used for Realtime subscriptions,
 * and for the Google/Microsoft/Facebook/Apple OAuth redirect flow (Supabase
 * Auth owns that round-trip; our backend only sees the resulting JWT via
 * POST /auth/oauth-sync). All CRUD still goes through our own API via
 * apiClient — this client never makes direct data calls.
 */
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "http://localhost:54321",
  import.meta.env.VITE_SUPABASE_ANON_KEY || "public-anon-key",
);
