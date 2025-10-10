import { createClient } from '@supabase/supabase-js';
import type { Env } from '../types/env';

export function getSupabaseClient(env: Env, jwt?: string) {
  return createClient(env.SUPABASE_URL, jwt || env.SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: jwt
        ? {
            Authorization: `Bearer ${jwt}`,
          }
        : undefined,
    },
  });
}

export function getSupabaseServiceClient(env: Env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

