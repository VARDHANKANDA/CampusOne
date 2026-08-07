import { createClient } from "@supabase/supabase-js";

/** Browser Supabase client — anon key only, used solely for Realtime
 * subscriptions (docs/DECISIONS.md ADR-010). All CRUD still goes through our
 * own API via apiClient; this client never issues auth/storage calls.
 */
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "http://localhost:54321",
  import.meta.env.VITE_SUPABASE_ANON_KEY || "public-anon-key",
);
