import { getSupabase } from '../lib/supabase';
import { distribuirPedido } from '../services/distribuicao.service';
import { Pedido } from '../services/pedidos.service';

const INTERVAL_MS = 5 * 60 * 1000; // 5 min

async function tick(): Promise<void> {
  const agora = new Date().toISOString();
  const db = getSupabase();

  const { data: pedidos, error } = await db
    .from('pedidos')
    .select('*')
    .eq('status', 'agendado')
    .lte('agendado_para', agora);

  if (error) {
    console.error('[job:agendamento] erro ao buscar:', error.message);
    return;
  }

  for (const p of (pedidos ?? []) as Pedido[]) {
    const { data: agencia } = await db
      .from('agencias')
      .select('id, distribuicao_modo, distribuicao_ultimo_entregador, whatsapp_dono')
      .eq('id', p.agencia_id)
      .single();

    if (!agencia) continue;

    // Atualiza status antes de distribuir
    await db.from('pedidos').update({ status: 'pendente' }).eq('id', p.id);
    p.status = 'pendente';

    try {
      await distribuirPedido(p, agencia as any);
      console.log(`[job] Pedido agendado ${p.id} disparado para entregadores`);
    } catch (err: any) {
      console.error(`[job:agendamento] falha ao distribuir ${p.id}:`, err?.message ?? err);
    }
  }
}

let started = false;
export function startAgendamentoJob(): void {
  if (started) return;
  started = true;
  console.log('[job] Job de agendamento iniciado (cada 5 min)');
  tick().catch((e) => console.error('[job:agendamento]', e));
  setInterval(() => {
    tick().catch((e) => console.error('[job:agendamento]', e));
  }, INTERVAL_MS);
}

startAgendamentoJob();
