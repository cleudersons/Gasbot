import { getSupabase } from '../lib/supabase';

export type PedidoStatus =
  | 'pendente'
  | 'agendado'
  | 'aceito'
  | 'em_entrega'
  | 'entregue'
  | 'entregue_nao_confirmado'
  | 'cancelado';

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
}

export async function salvarPedido(
  agenciaId: string,
  clienteWhatsapp: string,
  produto: string,
  quantidade: number,
  endereco: string,
  opts: { status?: PedidoStatus; agendadoPara?: Date; formaPagamento?: string | null } = {},
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
 */
export async function buscarPedidoPorPrefixo(
  agenciaId: string,
  prefixo: string,
): Promise<{ pedido: Pedido | null; ambiguo: boolean }> {
  const p = prefixo.trim().toLowerCase();
  if (p.length < 6) return { pedido: null, ambiguo: false };

  const { data, error } = await getSupabase()
    .from('pedidos')
    .select('*')
    .eq('agencia_id', agenciaId)
    .like('id::text', `${p}%`)
    .limit(2);

  if (error || !data || data.length === 0) return { pedido: null, ambiguo: false };
  if (data.length > 1) return { pedido: null, ambiguo: true };
  return { pedido: data[0] as Pedido, ambiguo: false };
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
): Promise<void> {
  const update: Record<string, unknown> = { status };
  if (entregadorId) update.entregador_id = entregadorId;

  const { error } = await getSupabase().from('pedidos').update(update).eq('id', pedidoId);
  if (error) throw new Error(`Erro ao atualizar pedido: ${error.message}`);
}
