import { getSupabase } from '../lib/supabase';
import * as whatsappService from './whatsapp/whatsapp.service';

type Frequencia = 'diario' | 'semanal' | 'mensal' | 'todos';

function periodoFromFrequencia(freq: Frequencia): { inicio: Date; rotulo: string } {
  const agora = new Date();
  if (freq === 'semanal') {
    const inicio = new Date(agora);
    inicio.setDate(agora.getDate() - 7);
    return { inicio, rotulo: 'últimos 7 dias' };
  }
  if (freq === 'mensal') {
    const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
    return { inicio, rotulo: agora.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) };
  }
  // diario (default)
  const inicio = new Date(agora);
  inicio.setHours(0, 0, 0, 0);
  return { inicio, rotulo: agora.toLocaleDateString('pt-BR') };
}

export async function gerarRelatorio(
  agenciaId: string,
  freq: Frequencia = 'diario',
): Promise<string> {
  const db = getSupabase();
  const { inicio, rotulo } = periodoFromFrequencia(freq);

  const { data: pedidos, error } = await db
    .from('pedidos')
    .select('status, entregador_id')
    .eq('agencia_id', agenciaId)
    .gte('criado_em', inicio.toISOString());

  if (error) throw new Error(`Erro ao buscar pedidos: ${error.message}`);

  const lista = pedidos ?? [];
  const entregues = lista.filter((p) => p.status === 'entregue').length;
  const naoConfirmados = lista.filter((p) => p.status === 'entregue_nao_confirmado').length;
  const cancelados = lista.filter((p) => p.status === 'cancelado').length;
  const total = lista.length;

  // entregador mais ativo
  const counts: Record<string, number> = {};
  for (const p of lista) {
    if (p.entregador_id) counts[p.entregador_id] = (counts[p.entregador_id] ?? 0) + 1;
  }
  let topNome = '—';
  let topQtd = 0;
  const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (topId) {
    topQtd = counts[topId];
    const { data: ent } = await db.from('entregadores').select('nome').eq('id', topId).single();
    topNome = ent?.nome ?? topId;
  }

  return (
    `📊 *Relatório SutoGas — ${rotulo}*\n` +
    `✅ Entregues confirmados: ${entregues}\n` +
    `⚠️ Não confirmados: ${naoConfirmados}\n` +
    `🔴 Cancelados: ${cancelados}\n` +
    `📦 Total: ${total}\n` +
    `🛵 Entregador mais ativo: ${topNome} (${topQtd} entregas)`
  );
}

export async function enviarRelatorio(agenciaId: string): Promise<void> {
  const db = getSupabase();
  const { data: agencia, error } = await db
    .from('agencias')
    .select('whatsapp_dono, relatorio_frequencia')
    .eq('id', agenciaId)
    .single();

  if (error || !agencia) throw new Error(`Agência não encontrada: ${agenciaId}`);
  if (!agencia.whatsapp_dono) throw new Error('Agência sem whatsapp_dono configurado');

  const freq = (agencia.relatorio_frequencia ?? 'diario') as Frequencia;
  const usadas: Frequencia[] = freq === 'todos' ? ['diario', 'semanal', 'mensal'] : [freq];

  for (const f of usadas) {
    const mensagem = await gerarRelatorio(agenciaId, f);
    await whatsappService.sendMessage(agenciaId, agencia.whatsapp_dono, mensagem);
  }

  await db
    .from('agencias')
    .update({ relatorio_ultimo_envio: new Date().toISOString() })
    .eq('id', agenciaId);
}
