import { getSupabase } from '../lib/supabase';

const INTERVAL_MS = 10 * 60 * 1000; // 10 minutos
const LIMITE_MS = 60 * 60 * 1000; // 1 hora

export async function checkEntregasNaoConfirmadas(): Promise<void> {
  const limite = new Date(Date.now() - LIMITE_MS).toISOString();

  const { data, error } = await getSupabase()
    .from('pedidos')
    .select('id')
    .eq('status', 'aceito')
    .lt('criado_em', limite);

  if (error) {
    console.error('[job:entrega] erro ao buscar pedidos:', error.message);
    return;
  }

  for (const pedido of data ?? []) {
    const { error: upErr } = await getSupabase()
      .from('pedidos')
      .update({ status: 'entregue_nao_confirmado' })
      .eq('id', pedido.id);

    if (upErr) {
      console.error(`[job:entrega] falha ao atualizar ${pedido.id}:`, upErr.message);
    } else {
      console.log(`[job] Pedido ${pedido.id} marcado como entregue_nao_confirmado`);
    }
  }
}

let started = false;
export function startEntregaJob(): void {
  if (started) return;
  started = true;
  console.log('[job] Job de entregas iniciado (cada 10 min)');
  // primeira execução imediata, depois a cada 10 min
  checkEntregasNaoConfirmadas().catch((e) => console.error('[job:entrega]', e));
  setInterval(() => {
    checkEntregasNaoConfirmadas().catch((e) => console.error('[job:entrega]', e));
  }, INTERVAL_MS);
}

startEntregaJob();
