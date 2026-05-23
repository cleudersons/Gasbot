import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _admin: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórios no servidor');
  }
  _admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return _admin;
}

export const SERVER_AGENCIA_ID =
  process.env.DEFAULT_AGENCIA_ID ?? process.env.NEXT_PUBLIC_DEFAULT_AGENCIA_ID ?? '';
