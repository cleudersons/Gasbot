import { getSupabase } from '../lib/supabase';
import { getStatus } from '../services/qrcode.service';

// Mantém zapi_status atualizado no banco pro pontinho do master refletir
// realidade. Sem isso o valor fica congelado desde o último clique manual.
const INTERVAL_MS = 5 * 60 * 1000; // 5 min
const CONCURRENCY = 5;

async function processar(): Promise<void> {
  const db = getSupabase();

  const { data: agencias, error } = await db
    .from('agencias')
    .select('id, zapi_instance_id, zapi_token, zapi_client_token, zapi_status')
    .eq('provider', 'zapi')
    .is('deletada_em', null)
    .not('zapi_instance_id', 'is', null)
    .not('zapi_token', 'is', null);

  if (error) {
    console.error('[job:zapi-poll] erro ao listar:', error.message);
    return;
  }
  if (!agencias || agencias.length === 0) return;

  // Processa em lotes pra não sobrecarregar a Z-API com muitas chamadas em paralelo
  for (let i = 0; i < agencias.length; i += CONCURRENCY) {
    const lote = agencias.slice(i, i + CONCURRENCY);
    await Promise.allSettled(
      lote.map(async (ag) => {
        try {
          const status = await getStatus(
            ag.zapi_instance_id!,
            ag.zapi_token!,
            ag.zapi_client_token,
          );
          if (status !== ag.zapi_status) {
            await db.from('agencias').update({ zapi_status: status }).eq('id', ag.id);
            console.log(`[job:zapi-poll] agência ${ag.id} ${ag.zapi_status} → ${status}`);
          }
        } catch (err: any) {
          console.warn(`[job:zapi-poll] falha em ${ag.id}: ${err?.message ?? err}`);
        }
      }),
    );
  }
}

// Roda 1x na subida (60s pra dar tempo do server iniciar) + a cada 5 min
setTimeout(() => {
  processar().catch((e) => console.error('[job:zapi-poll] erro inicial:', e));
}, 60_000);

setInterval(() => {
  processar().catch((e) => console.error('[job:zapi-poll] erro:', e));
}, INTERVAL_MS);
