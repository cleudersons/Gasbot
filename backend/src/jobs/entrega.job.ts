import { getSupabase } from '../lib/supabase';

const INTERVAL_MS = 60 * 1000; // 1 minuto — checagem fina pra timeouts curtos
const TIMEOUT_PENDENTE_MIN = 5;
const TIMEOUT_ACEITO_MIN = 60;

/**
 * Auto-progressão de status quando o entregador não responde:
 * - pedido pendente há mais de 5 min → vira "aceito" (auto)
 * - pedido aceito há mais de 1 h → vira "entregue" (auto)
 *
 * Em ambos os casos, status_auto=true marca que foi o sistema que mudou,
 * e o dashboard exibe um ícone amarelo de aviso.
 */
async function checkAutoProgressao(): Promise<void> {
  const db = getSupabase();
  const agora = Date.now();

  // 1) pendente > 5 min → aceito (auto)
  const limitePendente = new Date(agora - TIMEOUT_PENDENTE_MIN * 60 * 1000).toISOString();
  const { data: pendentes, error: errPend } = await db
    .from('pedidos')
    .select('id, criado_em, status_atualizado_em')
    .eq('status', 'pendente')
    .or(`status_atualizado_em.lt.${limitePendente},and(status_atualizado_em.is.null,criado_em.lt.${limitePendente})`);

  if (errPend) {
    console.error('[job:entrega] erro buscando pendentes:', errPend.message);
  } else {
    for (const p of pendentes ?? []) {
      const { error } = await db
        .from('pedidos')
        .update({
          status: 'aceito',
          status_auto: true,
          status_atualizado_em: new Date().toISOString(),
        })
        .eq('id', p.id);
      if (error) {
        console.error(`[job:entrega] falha auto-aceito em ${p.id}:`, error.message);
      } else {
        console.log(`[job] Pedido ${p.id.slice(0, 8)} auto-aceito (timeout ${TIMEOUT_PENDENTE_MIN} min)`);
      }
    }
  }

  // 2) aceito > 1 h → entregue (auto)
  const limiteAceito = new Date(agora - TIMEOUT_ACEITO_MIN * 60 * 1000).toISOString();
  const { data: aceitos, error: errAc } = await db
    .from('pedidos')
    .select('id, status_atualizado_em')
    .eq('status', 'aceito')
    .lt('status_atualizado_em', limiteAceito);

  if (errAc) {
    console.error('[job:entrega] erro buscando aceitos:', errAc.message);
  } else {
    for (const p of aceitos ?? []) {
      const { error } = await db
        .from('pedidos')
        .update({
          status: 'entregue',
          status_auto: true,
          status_atualizado_em: new Date().toISOString(),
        })
        .eq('id', p.id);
      if (error) {
        console.error(`[job:entrega] falha auto-entregue em ${p.id}:`, error.message);
      } else {
        console.log(`[job] Pedido ${p.id.slice(0, 8)} auto-entregue (timeout ${TIMEOUT_ACEITO_MIN} min)`);
      }
    }
  }
}

let started = false;
export function startEntregaJob(): void {
  if (started) return;
  started = true;
  console.log(
    `[job] Auto-progressão de status iniciada (cada 1 min, pendente>${TIMEOUT_PENDENTE_MIN}min → aceito, aceito>${TIMEOUT_ACEITO_MIN}min → entregue)`,
  );
  checkAutoProgressao().catch((e) => console.error('[job:entrega]', e));
  setInterval(() => {
    checkAutoProgressao().catch((e) => console.error('[job:entrega]', e));
  }, INTERVAL_MS);
}

startEntregaJob();
