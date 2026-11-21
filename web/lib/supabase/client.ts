"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicEnvironment, isSupabaseConfigured } from "@/lib/env";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createSupabaseBrowserClient() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase authentication is not configured.");
  }
  if (!browserClient) {
    browserClient = createBrowserClient(
      publicEnvironment.NEXT_PUBLIC_SUPABASE_URL!,
      publicEnvironment.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return browserClient;
}
