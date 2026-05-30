import { getSupabase } from '../../lib/supabase';
import * as metaProvider from './providers/meta.provider';
import * as zapiProvider from './providers/zapi.provider';
import { mapearTipoPix } from './providers/zapi.provider';

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

// Verifica se a agência tem credenciais Meta/Z-API completas configuradas.
// Quando não tem, caímos no provider 'demo' (nosso número) para que o
// cliente possa testar o fluxo de ponta a ponta antes de conectar o WhatsApp dele.
function temCredenciaisReais(agencia: any): boolean {
  if (agencia?.provider === 'meta') {
    return !!(
      (agencia.phone_number_id ?? agencia.meta_phone_number_id) &&
      (agencia.whatsapp_token ?? agencia.meta_access_token)
    );
  }
  if (agencia?.provider === 'zapi') {
    return !!(agencia.zapi_instance_id && agencia.zapi_token);
  }
  return false;
}

// Identifica erros de "WhatsApp desconectado" (Z-API ou Meta) pra ativar fallback demo.
function ehDesconectado(err: any): boolean {
  const data = err?.response?.data;
  const dataStr = typeof data === 'string' ? data : JSON.stringify(data ?? {});
  const msg = `${err?.message ?? ''} ${dataStr}`.toLowerCase();
  return (
    msg.includes('disconnected') ||
    msg.includes('enqueue message is disabled') ||
    msg.includes('not connected') ||
    msg.includes('session not found') ||
    err?.response?.status === 401 // token Meta vencido também conta
  );
}

// Envia via nosso número demo (Meta API global). Usado pra clientes ainda
// sem credenciais OU quando as credenciais reais falham por desconexão.
async function enviarViaDemo(to: string, message: string): Promise<void> {
  const phoneNumberId =
    process.env.META_DEMO_PHONE_NUMBER_ID?.trim() ??
    process.env.META_PHONE_NUMBER_ID?.trim();
  const accessToken =
    process.env.META_DEMO_ACCESS_TOKEN?.trim() ??
    process.env.META_ACCESS_TOKEN?.trim();

  if (!phoneNumberId || !accessToken) {
    throw new Error('META_PHONE_NUMBER_ID/META_ACCESS_TOKEN ausentes nas env vars');
  }

  await metaProvider.sendMessage(phoneNumberId, accessToken, to, message);
}

export async function sendMessage(agenciaId: string, to: string, message: string): Promise<void> {
  const agencia = await getAgencia(agenciaId);
  const provider = agencia?.provider ?? agencia?.whatsapp_provider ?? 'meta';

  // Sem credenciais reais → vai direto pelo demo
  if (!temCredenciaisReais(agencia)) {
    await enviarViaDemo(to, message);
    return;
  }

  // Tenta provider real. Se falhar com erro de "desconectado", cai pro demo.
  // Outros erros (rate limit, payload inválido) propagam normalmente.
  try {
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
  } catch (err: any) {
    if (ehDesconectado(err)) {
      console.warn(
        `[whatsapp] agência ${agenciaId} provider=${provider} desconectado — caindo pro demo`,
      );
      await enviarViaDemo(to, message);
      return;
    }
    throw err;
  }

  // Provider 'demo' — agências criadas pelo fluxo de trial demo. Usam as
  // credenciais Meta globais do servidor (mesmo número que recebeu a mensagem).
  if (provider === 'demo') {
    const phoneNumberId =
      process.env.META_DEMO_PHONE_NUMBER_ID?.trim() ??
      process.env.META_PHONE_NUMBER_ID?.trim();
    const accessToken =
      process.env.META_DEMO_ACCESS_TOKEN?.trim() ??
      process.env.META_ACCESS_TOKEN?.trim();

    if (!phoneNumberId || !accessToken) {
      throw new Error(
        'Demo: META_PHONE_NUMBER_ID/META_ACCESS_TOKEN ausentes nas env vars',
      );
    }

    await metaProvider.sendMessage(phoneNumberId, accessToken, to, message);
    return;
  }

  throw new Error(`Provider WhatsApp desconhecido: ${provider}`);
}

/**
 * Tenta enviar o card oficial de PIX (Z-API only por enquanto).
 * Retorna true se enviou via card, false se não tem suporte (cair pro fallback texto).
 * Lança erro só se for um erro inesperado (ex: rede) — Z-API sem credenciais retorna false.
 */
export async function sendPixCard(
  agenciaId: string,
  to: string,
  params: { pixKey: string; pixKeyType: string; merchantName: string; value?: number },
): Promise<boolean> {
  const agencia = await getAgencia(agenciaId);

  // Só Z-API por enquanto. Meta/demo: cai pro fallback texto.
  if (agencia?.provider !== 'zapi' || !agencia.zapi_instance_id || !agencia.zapi_token) {
    return false;
  }

  const tipoConvertido = mapearTipoPix(params.pixKeyType);
  if (!tipoConvertido) {
    console.warn(`[whatsapp] tipo PIX nao reconhecido: ${params.pixKeyType}`);
    return false;
  }

  try {
    await zapiProvider.sendPixPayment(
      agencia.zapi_instance_id,
      agencia.zapi_token,
      to,
      {
        pixKey: params.pixKey,
        pixKeyType: tipoConvertido,
        merchantName: params.merchantName,
        value: params.value,
      },
      agencia.zapi_client_token,
    );
    return true;
  } catch (err: any) {
    console.error('[whatsapp] sendPixCard via Z-API falhou:', err?.response?.data ?? err?.message ?? err);
    return false;
  }
}
