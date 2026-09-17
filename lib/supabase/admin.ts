import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

// SERVER ONLY — this module bypasses Row Level Security using
// SUPABASE_SECRET_KEY. It is used by Trigger.dev tasks and server-side admin
// work. Never import it from Client Components, and never use it to serve a
// user-facing request (that belongs in lib/supabase/server.ts).

export function createAdminClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Supabase admin client is missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY. Copy .env.example to .env.local and fill in the values.",
    );
  }

  return createClient<Database>(url, secretKey);
}