import { createBrowserClient } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createBrowserClient(url, anonKey);

export const DEFAULT_AGENCIA_ID =
  process.env.NEXT_PUBLIC_DEFAULT_AGENCIA_ID ?? '';
