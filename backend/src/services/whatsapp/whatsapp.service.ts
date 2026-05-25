import { getSupabase } from '../../lib/supabase';
import * as metaProvider from './providers/meta.provider';
import * as zapiProvider from './providers/zapi.provider';

interface AgenciaCacheEntry {
  data: any;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const agenciaCache = new Map<string, AgenciaCacheEntry>();

export async function getAgencia(agenciaId: string): Promise<any> {
  const cached = agenciaCache.get(agenciaId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const { data, error } = await getSupabase()
    .from('agencias')
    .select('*')
    .eq('id', agenciaId)
    .single();

  if (error) throw new Error(`Erro ao buscar agência ${agenciaId}: ${error.message}`);

  agenciaCache.set(agenciaId, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}

export function invalidateAgenciaCache(agenciaId: string): void {
  agenciaCache.delete(agenciaId);
}

export async function sendMessage(agenciaId: string, to: string, message: string): Promise<void> {
  const agencia = await getAgencia(agenciaId);
  const provider = agencia?.provider ?? agencia?.whatsapp_provider ?? 'meta';

  if (provider === 'zapi') {
    await zapiProvider.sendMessage(
      agencia.zapi_instance_id,
      agencia.zapi_token,
      to,
      message,
      agencia.zapi_client_token,
    );
    return;
  }

  if (provider === 'meta') {
    await metaProvider.sendMessage(
      agencia.phone_number_id ?? agencia.meta_phone_number_id,
      agencia.whatsapp_token ?? agencia.meta_access_token,
      to,
      message,
    );
    return;
  }

  throw new Error(`Provider WhatsApp desconhecido: ${provider}`);
}
