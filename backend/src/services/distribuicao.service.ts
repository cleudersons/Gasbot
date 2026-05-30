import { getSupabase } from '../lib/supabase';
import * as whatsappService from './whatsapp/whatsapp.service';
import { buscarEntregadoresAtivos, Entregador } from './entregadores.service';
import { Pedido } from './pedidos.service';

interface AgenciaInfo {
  id: string;
  distribuicao_modo?: string | null;
  distribuicao_ultimo_entregador?: string | null;
  whatsapp_dono?: string | null;
}

function montarAviso(p: Pedido): string {
  const pagamento = p.forma_pagamento ? `\n💳 Pagamento: ${p.forma_pagamento}` : '';

  // Multi-item: lista cada item; senão usa produto/quantidade legados
  let blocoItens: string;
  if (p.itens && p.itens.length > 0) {
    blocoItens =
      `📦 Itens:\n` +
      p.itens.map((i) => `   • ${i.quantidade}x ${i.produto}`).join('\n');
  } else {
    blocoItens = `📦 Produto: ${p.produto} x${p.quantidade}`;
  }

  const total =
    p.valor_total != null
      ? `\n💰 Total: ${p.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
      : '';

  return (
    `🛵 *Novo Pedido!*\n` +
    blocoItens +
    total +
    `\n👤 Cliente: ${p.cliente_whatsapp}\n` +
    `📍 Endereço: ${p.endereco}` +
    pagamento +
    `\n🗺 Maps: ${p.maps_link}\n` +
    `🕐 ${new Date().toLocaleString('pt-BR')}\n\n` +
    `Responda *aceito* para pegar ou *não aceito* para recusar.`
  );
}

async function notificar(agenciaId: string, entregadores: Entregador[], aviso: string) {
  // Paralelo em vez de série — evita travar quando algum provider tá lento
  // (ex: Z-API com sessão morta gasta 10s antes de cair no fallback).
  await Promise.allSettled(
    entregadores.map(async (e) => {
      try {
        await whatsappService.sendMessage(agenciaId, e.whatsapp, aviso);
        console.log(`[distribuicao] aviso enviado para ${e.nome}`);
      } catch (err: any) {
        console.error(
          `[distribuicao] falha em ${e.id} (${e.nome}):`,
          err?.response?.data ?? err?.message ?? err,
        );
      }
    }),
  );
}

async function distribuirRevezamento(
  agencia: AgenciaInfo,
  entregadores: Entregador[],
  pedido: Pedido,
) {
  if (entregadores.length === 0) return;

  const ordenados = [...entregadores].sort((a, b) => a.id.localeCompare(b.id));
  const ultimoId = agencia.distribuicao_ultimo_entregador;
  const idx = ultimoId ? ordenados.findIndex((e) => e.id === ultimoId) : -1;
  const proximo = ordenados[(idx + 1) % ordenados.length];

  await getSupabase()
    .from('agencias')
    .update({ distribuicao_ultimo_entregador: proximo.id })
    .eq('id', agencia.id);

  await notificar(agencia.id, [proximo], montarAviso(pedido));
}

async function distribuirPorZonas(
  agencia: AgenciaInfo,
  entregadores: Entregador[],
  pedido: Pedido,
) {
  const { data: zonas } = await getSupabase()
    .from('entregador_zonas')
    .select('entregador_id, zona')
    .eq('agencia_id', agencia.id);

  const enderecoLower = pedido.endereco.toLowerCase();
  const matchIds = new Set<string>();
  for (const z of zonas ?? []) {
    if (enderecoLower.includes(z.zona.toLowerCase())) {
      matchIds.add(z.entregador_id);
    }
  }

  const filtrados = entregadores.filter((e) => matchIds.has(e.id));

  if (filtrados.length === 0) {
    console.log('[distribuicao] nenhuma zona casou — fallback para todos');
    await notificar(agencia.id, entregadores, montarAviso(pedido));
    return;
  }

  await notificar(agencia.id, filtrados, montarAviso(pedido));
}

async function distribuirManual(agencia: AgenciaInfo, _pedido: Pedido) {
  if (!agencia.whatsapp_dono) {
    console.warn('[distribuicao] modo manual mas whatsapp_dono não configurado');
    return;
  }
  try {
    await whatsappService.sendMessage(
      agencia.id,
      agencia.whatsapp_dono,
      '📋 Novo pedido manual! Acesse o dashboard para atribuir a um entregador.',
    );
  } catch (err: any) {
    console.error('[distribuicao manual] falha ao avisar dono:', err?.message ?? err);
  }
}

// Repassa pedido pro próximo entregador após uma rejeição.
// No modo revezamento: avança cursor pro próximo não-rejeitado e notifica só ele.
// Nos demais modos: já foram notificados no broadcast inicial, nada a fazer.
export async function repassarAposRejeicao(
  pedido: Pedido,
  agencia: AgenciaInfo,
  rejeitadoPor: string[],
): Promise<void> {
  const modo = agencia.distribuicao_modo ?? 'todos';
  if (modo !== 'revezamento') return;

  const entregadores = await buscarEntregadoresAtivos(agencia.id);
  const candidatos = entregadores.filter((e) => !rejeitadoPor.includes(e.id));
  if (candidatos.length === 0) return;

  const ordenados = [...candidatos].sort((a, b) => a.id.localeCompare(b.id));
  const proximo = ordenados[0];

  await getSupabase()
    .from('agencias')
    .update({ distribuicao_ultimo_entregador: proximo.id })
    .eq('id', agencia.id);

  await notificar(agencia.id, [proximo], montarAviso(pedido));
}

// Manda mensagem ao dono no WhatsApp + cria notificação no sininho do dashboard.
// Disparada quando TODOS os entregadores ativos rejeitaram um pedido.
export async function notificarDonoSemEntregador(
  agencia: AgenciaInfo,
  pedido: Pedido,
): Promise<void> {
  const idCurto = pedido.id.slice(0, 8);
  const mensagem =
    `⚠️ *Nenhum entregador aceitou o pedido!*\n\n` +
    `📦 ${pedido.produto} x${pedido.quantidade}\n` +
    `📍 ${pedido.endereco}\n` +
    `🆔 ${idCurto}\n\n` +
    `Acesse o painel para atribuir manualmente.`;

  if (agencia.whatsapp_dono) {
    try {
      await whatsappService.sendMessage(agencia.id, agencia.whatsapp_dono, mensagem);
    } catch (err: any) {
      console.error('[distribuicao] falha ao avisar dono:', err?.message ?? err);
    }
  }

  try {
    await getSupabase().from('notificacoes').insert({
      agencia_id: agencia.id,
      tipo: 'pedido_sem_entregador',
      categoria: 'alerta',
      titulo: 'Nenhum entregador aceitou um pedido',
      mensagem: `${pedido.produto} x${pedido.quantidade} — ${pedido.endereco}`,
      link: '/dashboard',
    });
  } catch (err: any) {
    console.error('[distribuicao] falha ao criar notificação sininho:', err?.message ?? err);
  }
}

export async function distribuirPedido(pedido: Pedido, agencia: AgenciaInfo): Promise<void> {
  const modo = agencia.distribuicao_modo ?? 'todos';
  const entregadores = await buscarEntregadoresAtivos(agencia.id);

  if (modo === 'manual') {
    await distribuirManual(agencia, pedido);
    return;
  }

  if (entregadores.length === 0) {
    console.warn(`[distribuicao] agência ${agencia.id} sem entregadores ativos`);
    return;
  }

  if (modo === 'revezamento') {
    await distribuirRevezamento(agencia, entregadores, pedido);
    return;
  }

  if (modo === 'zonas') {
    await distribuirPorZonas(agencia, entregadores, pedido);
    return;
  }

  // 'todos' (default)
  await notificar(agencia.id, entregadores, montarAviso(pedido));
}
