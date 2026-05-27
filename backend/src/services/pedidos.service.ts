import { getSupabase } from '../lib/supabase';
import { variantesWhatsappBR } from '../utils/whatsapp-format';

export type PedidoStatus =
  | 'pendente'
  | 'agendado'
  | 'aceito'
  | 'em_entrega'
  | 'entregue'
  | 'entregue_nao_confirmado'
  | 'cancelado';

export interface PedidoItem {
  produto: string;
  quantidade: number;
  preco_unit?: number | null;
  subtotal?: number | null;
}

export interface Pedido {
  id: string;
  agencia_id: string;
  cliente_whatsapp: string;
  produto: string;
  quantidade: number;
  endereco: string;
  maps_link: string;
  status: PedidoStatus;
  criado_em: string;
  forma_pagamento?: string | null;
  status_auto?: boolean;
  status_atualizado_em?: string | null;
  entregador_id?: string | null;
  itens?: PedidoItem[] | null;
  valor_total?: number | null;
}

export async function salvarPedido(
  agenciaId: string,
  clienteWhatsapp: string,
  produto: string,
  quantidade: number,
  endereco: string,
  opts: {
    status?: PedidoStatus;
    agendadoPara?: Date;
    formaPagamento?: string | null;
    itens?: PedidoItem[] | null;
    valorTotal?: number | null;
  } = {},
): Promise<Pedido> {
  const maps_link = `https://maps.google.com/?q=${encodeURIComponent(endereco)}`;

  const insert: Record<string, unknown> = {
    agencia_id: agenciaId,
    cliente_whatsapp: clienteWhatsapp,
    produto,
    quantidade,
    endereco,
    maps_link,
    status: opts.status ?? 'pendente',
  };
  if (opts.agendadoPara) insert.agendado_para = opts.agendadoPara.toISOString();
  if (opts.formaPagamento) insert.forma_pagamento = opts.formaPagamento;
  if (opts.itens && opts.itens.length > 0) insert.itens = opts.itens;
  if (opts.valorTotal != null) insert.valor_total = opts.valorTotal;

  const { data, error } = await getSupabase()
    .from('pedidos')
    .insert(insert)
    .select()
    .single();

  if (error) throw new Error(`Erro ao salvar pedido: ${error.message}`);
  return data as Pedido;
}

/**
 * Procura um pedido pelo prefixo curto do UUID (mínimo 6 chars).
 * Aceita também o UUID completo. Retorna null se não achar ou se
 * houver mais de um match (ambíguo).
 *
 * Filtragem feita em JS porque o supabase-js não suporta LIKE em colunas UUID
 * (precisaria de cast ::text, que o PostgREST não aceita em .filter()).
 */
export async function buscarPedidoPorPrefixo(
  agenciaId: string,
  prefixo: string,
): Promise<{ pedido: Pedido | null; ambiguo: boolean }> {
  const p = prefixo.trim().toLowerCase();
  if (p.length < 6) return { pedido: null, ambiguo: false };

  // Filtra só pedidos ativos pra não confundir com pedidos antigos já fechados
  const { data, error } = await getSupabase()
    .from('pedidos')
    .select('*')
    .eq('agencia_id', agenciaId)
    .in('status', ['pendente', 'aceito', 'em_entrega'])
    .order('criado_em', { ascending: false })
    .limit(50);

  if (error || !data) return { pedido: null, ambiguo: false };

  const matches = (data as Pedido[]).filter((r) => r.id.toLowerCase().startsWith(p));
  if (matches.length === 0) return { pedido: null, ambiguo: false };
  if (matches.length > 1) return { pedido: null, ambiguo: true };
  return { pedido: matches[0], ambiguo: false };
}

export async function buscarPedidosAtivosDoEntregador(
  agenciaId: string,
  entregadorId: string,
): Promise<Pedido[]> {
  const { data, error } = await getSupabase()
    .from('pedidos')
    .select('*')
    .eq('agencia_id', agenciaId)
    .eq('entregador_id', entregadorId)
    .in('status', ['aceito', 'em_entrega'])
    .order('criado_em', { ascending: true });

  if (error) throw new Error(`Erro ao buscar pedidos do entregador: ${error.message}`);
  return (data ?? []) as Pedido[];
}

export interface PedidoAtivoComEntregador extends Pedido {
  entregador_nome: string | null;
  entregador_whatsapp: string | null;
  ultimo_contato_entregador?: string | null;
}

/**
 * Procura o pedido ativo (pendente | aceito | em_entrega) mais recente desse cliente.
 * Resolve as variantes brasileiras com/sem "9" no DDD.
 * Retorna também nome e whatsapp do entregador quando entregador_id está setado.
 */
export async function buscarPedidoAtivoDoCliente(
  agenciaId: string,
  whatsapp: string,
): Promise<PedidoAtivoComEntregador | null> {
  const db = getSupabase();
  const variantes = variantesWhatsappBR(whatsapp);

  const { data, error } = await db
    .from('pedidos')
    .select('*')
    .eq('agencia_id', agenciaId)
    .in('cliente_whatsapp', variantes)
    .in('status', ['pendente', 'aceito', 'em_entrega'])
    .order('criado_em', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return null;

  const pedido = data[0] as Pedido & { ultimo_contato_entregador?: string | null };

  let entregadorNome: string | null = null;
  let entregadorWhats: string | null = null;
  if (pedido.entregador_id) {
    const { data: ent } = await db
      .from('entregadores')
      .select('nome, whatsapp')
      .eq('id', pedido.entregador_id)
      .maybeSingle();
    if (ent) {
      entregadorNome = (ent as any).nome ?? null;
      entregadorWhats = (ent as any).whatsapp ?? null;
    }
  }

  return {
    ...pedido,
    entregador_nome: entregadorNome,
    entregador_whatsapp: entregadorWhats,
  };
}

/**
 * Procura o último pedido ENTREGUE desse cliente dentro de uma janela
 * (default 120 min). Usado pra que o agente saiba responder caso o cliente
 * pergunte/agradeça logo após a entrega, sem confundir com um novo pedido.
 */
export async function buscarUltimoPedidoEntregue(
  agenciaId: string,
  whatsapp: string,
  dentroMin: number = 120,
): Promise<(Pedido & { entregador_nome: string | null; entregue_ha_min: number }) | null> {
  const db = getSupabase();
  const variantes = variantesWhatsappBR(whatsapp);
  const limite = new Date(Date.now() - dentroMin * 60 * 1000).toISOString();

  const { data } = await db
    .from('pedidos')
    .select('*')
    .eq('agencia_id', agenciaId)
    .in('cliente_whatsapp', variantes)
    .eq('status', 'entregue')
    .gte('status_atualizado_em', limite)
    .order('status_atualizado_em', { ascending: false })
    .limit(1);

  if (!data || data.length === 0) return null;
  const pedido = data[0] as Pedido & { status_atualizado_em?: string | null };

  let entregadorNome: string | null = null;
  if (pedido.entregador_id) {
    const { data: ent } = await db
      .from('entregadores')
      .select('nome')
      .eq('id', pedido.entregador_id)
      .maybeSingle();
    if (ent) entregadorNome = (ent as any).nome ?? null;
  }

  const entregueEm = pedido.status_atualizado_em
    ? new Date(pedido.status_atualizado_em).getTime()
    : Date.now();
  const entregueHaMin = Math.round((Date.now() - entregueEm) / 60000);

  return { ...pedido, entregador_nome: entregadorNome, entregue_ha_min: entregueHaMin };
}

/** Registra que o entregador acabou de ser cobrado por causa desse pedido. */
export async function marcarContatoEntregador(pedidoId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('pedidos')
    .update({ ultimo_contato_entregador: new Date().toISOString() })
    .eq('id', pedidoId);
  if (error) console.error('[pedido] erro ao marcar contato entregador:', error.message);
}

/**
 * Conta pedidos confirmados (status ≠ cancelado) da agência nos últimos 30 dias.
 * Usado pelo enforcement do limite mensal do plano.
 */
export async function contarPedidosUltimos30Dias(agenciaId: string): Promise<number> {
  const trintaDias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await getSupabase()
    .from('pedidos')
    .select('id', { count: 'exact', head: true })
    .eq('agencia_id', agenciaId)
    .neq('status', 'cancelado')
    .gte('criado_em', trintaDias);
  if (error) {
    console.error('[pedido] erro ao contar mês:', error.message);
    return 0;
  }
  return count ?? 0;
}

export async function buscarPedidosPendentes(agenciaId: string): Promise<Pedido[]> {
  const { data, error } = await getSupabase()
    .from('pedidos')
    .select('*')
    .eq('agencia_id', agenciaId)
    .eq('status', 'pendente')
    .order('criado_em', { ascending: true });

  if (error) throw new Error(`Erro ao buscar pedidos pendentes: ${error.message}`);
  return (data ?? []) as Pedido[];
}

export async function atualizarStatus(
  pedidoId: string,
  status: PedidoStatus,
  entregadorId?: string,
  opts: { auto?: boolean } = {},
): Promise<void> {
  const update: Record<string, unknown> = {
    status,
    status_atualizado_em: new Date().toISOString(),
    status_auto: !!opts.auto,
  };
  if (entregadorId) update.entregador_id = entregadorId;

  const { error } = await getSupabase().from('pedidos').update(update).eq('id', pedidoId);
  if (error) throw new Error(`Erro ao atualizar pedido: ${error.message}`);
}
