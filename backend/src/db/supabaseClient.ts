import { createClient } from '@supabase/supabase-js';

let supabaseInstance: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn(
        " SUPABASE_URL or SUPABASE_KEY is missing from environment variables. " +
        "The Supabase Client is initialized with a safe placeholder to avoid crashes on startup."
      );
      // Return a dummy client initialized with placeholder credentials to prevent app startup crashes
      return createClient(
        supabaseUrl || 'https://placeholder.supabase.co',
        supabaseKey || 'placeholder-anon-key'
      );
    }

    supabaseInstance = createClient(supabaseUrl, supabaseKey);
    console.log(" Supabase Client initialized successfully!");
  }
  return supabaseInstance;
}

export const supabase = getSupabaseClient();
