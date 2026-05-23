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
  return (
    `🛵 *Novo Pedido!*\n` +
    `📦 Produto: ${p.produto} x${p.quantidade}\n` +
    `👤 Cliente: ${p.cliente_whatsapp}\n` +
    `📍 Endereço: ${p.endereco}` +
    pagamento +
    `\n🗺 Maps: ${p.maps_link}\n` +
    `🆔 ID: ${p.id}\n` +
    `🕐 ${new Date().toLocaleString('pt-BR')}`
  );
}

async function notificar(agenciaId: string, entregadores: Entregador[], aviso: string) {
  for (const e of entregadores) {
    try {
      await whatsappService.sendMessage(agenciaId, e.whatsapp, aviso);
      console.log(`[distribuicao] aviso enviado para ${e.nome}`);
    } catch (err: any) {
      console.error(
        `[distribuicao] falha em ${e.id} (${e.nome}):`,
        err?.response?.data ?? err?.message ?? err,
      );
    }
  }
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
